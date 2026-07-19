import Link from "next/link";
import { Compass, Users } from "lucide-react";

import { JournalComposerBar } from "@/components/profile/journal-composer-bar";
import { JournalGrid } from "@/components/profile/journal-grid";
import { StoryBar } from "@/components/stories/story-bar";
import type { StoryGroup } from "@/components/stories/story-viewer";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

/**
 * The logged-in home: a following feed. Journal posts from the riders you follow
 * (and your own), newest first, with the story bar and a composer on top. This is
 * the consumption half of the journal split — you create on your profile, you
 * catch up here.
 */
export async function HomeFeed({
  viewer,
}: {
  viewer: { id: string; name: string; avatarUrl: string | null };
}) {
  const following = await prisma.riderFollow.findMany({
    where: { followerId: viewer.id },
    select: { followingId: true },
  });
  const authorIds = [...new Set([...following.map((f) => f.followingId), viewer.id])];

  const entries = await prisma.journalEntry.findMany({
    where: { authorId: { in: authorIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
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

  const feed = entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: entry.likes.some((l) => l.riderId === viewer.id),
    isSaved: entry.saves.some((s) => s.riderId === viewer.id),
    comments: entry.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      authorHandle: c.author.handle,
      createdAt: c.createdAt.toISOString(),
    })),
    authorName: entry.author.name,
    authorAvatarUrl: mediaUrl(entry.author.avatarUrl),
    profileUrl: `/r/${entry.author.handle}`,
  }));

  // Stories bar — community stories + the viewer's own add bubble.
  const activeStories = await prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      url: true,
      caption: true,
      createdAt: true,
      rider: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    },
  });
  const storyMap = new Map<string, StoryGroup>();
  for (const s of activeStories) {
    let group = storyMap.get(s.rider.id);
    if (!group) {
      group = {
        rider: { id: s.rider.id, name: s.rider.name, handle: s.rider.handle, avatarUrl: mediaUrl(s.rider.avatarUrl) },
        stories: [],
      };
      storyMap.set(s.rider.id, group);
    }
    group.stories.push({ id: s.id, url: s.url, caption: s.caption, createdAt: s.createdAt.toISOString() });
  }
  const storyGroups = [...storyMap.values()].sort((a, b) => {
    if (a.rider.id === viewer.id) return -1;
    if (b.rider.id === viewer.id) return 1;
    return (
      new Date(b.stories[b.stories.length - 1].createdAt).getTime() -
      new Date(a.stories[a.stories.length - 1].createdAt).getTime()
    );
  });

  const viewerAvatar = mediaUrl(viewer.avatarUrl);

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <StoryBar groups={storyGroups} currentRiderId={viewer.id} canPost currentAvatarUrl={viewerAvatar} />
        </div>

        <JournalComposerBar avatarUrl={viewerAvatar} firstName={viewer.name.split(" ")[0]} />

        {feed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-canvas p-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm font-medium text-ink">Your feed is quiet</p>
            <p className="mt-1 text-sm text-muted">
              Follow riders and their ride journals show up here. Post your own above to get things rolling.
            </p>
            <Link
              href="/r"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
            >
              <Compass className="h-4 w-4" /> Find riders to follow
            </Link>
          </div>
        ) : (
          <JournalGrid entries={feed} isOwner={false} isAuthenticated layout="feed" />
        )}
      </div>
    </section>
  );
}
