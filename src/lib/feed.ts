import type { JournalGridEntry } from "@/components/profile/journal-grid";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const FEED_PAGE_SIZE = 20;
export type FeedMode = "following" | "discover" | "mine";

/**
 * A page of feed entries for the home feed. "following" = riders you follow +
 * yourself, newest first. "discover" = riders you don't follow, ranked by
 * momentum (trending) then recency. "mine" = only your own posts, newest first.
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
  const where =
    mode === "mine"
      ? { authorId: viewerId }
      : mode === "discover"
        ? { authorId: { notIn: knownIds } }
        : { authorId: { in: knownIds } };
  const orderBy =
    mode === "discover"
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
      likes: { select: { riderId: true } },
      saves: { select: { riderId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, body: true, createdAt: true, author: { select: { name: true, handle: true } } },
      },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: entry.likes.some((l) => l.riderId === viewerId),
    isSaved: entry.saves.some((s) => s.riderId === viewerId),
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
