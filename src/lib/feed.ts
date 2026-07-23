import type { JournalGridEntry } from "@/components/profile/journal-grid";
import { formatPostTimestamp } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const FEED_PAGE_SIZE = 20;
export type FeedMode = "latest" | "following" | "momentum";

/**
 * A page of feed entries for the home feed.
 *
 * Chronological is the default everywhere — the community feed should show what
 * actually happened, in order, not what an algorithm decided to promote. Ranking
 * is confined to one clearly-labelled, opt-in tab.
 *
 * "latest"    = the whole community, newest first (the default).
 * "following" = riders you follow + yourself, newest first.
 * "momentum"  = the whole community, ranked by momentum (trending) then recency.
 */
export async function getFeedEntries({
  viewerId,
  knownIds,
  mode,
  skip = 0,
  take = FEED_PAGE_SIZE,
}: {
  viewerId: string;
  knownIds: string[];
  mode: FeedMode;
  skip?: number;
  take?: number;
}): Promise<JournalGridEntry[]> {
  // Timestamps render in the viewer's zone. Resolved here because every caller
  // already passes viewerId, and none of them had the zone to hand.
  const viewer = await prisma.rider.findUnique({
    where: { id: viewerId },
    select: { timezone: true },
  });

  const where = mode === "following" ? { authorId: { in: knownIds } } : {};
  const orderBy =
    mode === "momentum"
      ? [{ momentum: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy,
    skip,
    take,
    select: {
      id: true,
      title: true,
      body: true,
      videoUrl: true,
      createdAt: true,
      author: { select: { name: true, handle: true, avatarUrl: true } },
      galleryItems: { orderBy: { createdAt: "asc" }, take: 1, select: { url: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, body: true, createdAt: true, author: { select: { name: true, handle: true } } },
      },
    },
  });

  // Per-viewer like/save flags: fetch only the viewer's own rows for this page,
  // instead of pulling every liker/saver of each entry to scan in JS (a popular
  // post could carry thousands). Two indexed lookups scoped to the page ids.
  const pageIds = entries.map((e) => e.id);
  const [likedRows, savedRows] = pageIds.length
    ? await Promise.all([
        prisma.like.findMany({
          where: { riderId: viewerId, journalEntryId: { in: pageIds } },
          select: { journalEntryId: true },
        }),
        prisma.save.findMany({
          where: { riderId: viewerId, journalEntryId: { in: pageIds } },
          select: { journalEntryId: true },
        }),
      ])
    : [[], []];
  const likedSet = new Set(likedRows.map((r) => r.journalEntryId));
  const savedSet = new Set(savedRows.map((r) => r.journalEntryId));

  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: formatPostTimestamp(entry.createdAt, viewer?.timezone),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: likedSet.has(entry.id),
    isSaved: savedSet.has(entry.id),
    comments: entry.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      authorHandle: c.author.handle,
      createdAt: c.createdAt.toISOString(),
    })),
    authorName: entry.author.name,
    authorAvatarUrl: mediaUrl(entry.author.avatarUrl) ?? "",
    profileUrl: `/r/${entry.author.handle}`,
  }));
}
