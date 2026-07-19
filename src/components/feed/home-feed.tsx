import Link from "next/link";
import { Compass, MapPin, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { FeedList } from "@/components/feed/feed-list";
import { FeedRightRail } from "@/components/feed/feed-right-rail";
import { CoverPhoto } from "@/components/profile/cover-photo";
import { JournalComposerBar } from "@/components/profile/journal-composer-bar";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { StoryBar } from "@/components/stories/story-bar";
import type { StoryGroup } from "@/components/stories/story-viewer";
import { FEED_PAGE_SIZE, getFeedEntries } from "@/lib/feed";
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
  mode = "following",
}: {
  viewer: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    coverPosition: number;
    location: string | null;
  };
  mode?: "foryou" | "following" | "discover" | "mine";
}) {
  const following = await prisma.riderFollow.findMany({
    where: { followerId: viewer.id },
    select: { followingId: true },
  });
  // "Following" = riders you follow + yourself. "Discover" = everyone else, so
  // it surfaces riders you're not following yet.
  const knownIds = [...new Set([...following.map((f) => f.followingId), viewer.id])];
  const feed = await getFeedEntries({ viewerId: viewer.id, knownIds, mode, take: FEED_PAGE_SIZE });

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
  const viewerCover = mediaUrl(viewer.coverUrl);

  const TABS: { mode: "foryou" | "following" | "discover" | "mine"; label: string; href: string }[] = [
    { mode: "foryou", label: "For You", href: "/feed" },
    { mode: "following", label: "Following", href: "/feed?feed=following" },
    { mode: "discover", label: "Discover", href: "/feed?feed=discover" },
    { mode: "mine", label: "Mine", href: "/feed?feed=mine" },
  ];

  return (
    <AppShell>
      {/* Cover + avatar header — same CoverPhoto + layout as the profile so the
          feed and profile feel like one continuous space. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <CoverPhoto url={viewerCover || null} name={viewer.name} position={viewer.coverPosition} canReposition={false} />
        <div className="relative px-5 pb-5 sm:px-8">
          <div className="absolute -top-12 left-5 sm:-top-16 sm:left-8">
            {viewerAvatar ? (
              <img
                src={viewerAvatar}
                alt={viewer.name}
                className="h-24 w-24 rounded-full border-4 border-surface object-cover shadow-lift sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-sunset/10 font-display text-4xl font-bold text-sunset shadow-lift sm:h-32 sm:w-32">
                {viewer.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="pt-14 sm:pl-36 sm:pt-4">
            <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-3xl">{viewer.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
              <span>@{viewer.handle}</span>
              {viewer.location && (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>·</span>
                  <MapPin className="h-3 w-3 text-sunset" />
                  {viewer.location}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="w-full min-w-0 space-y-4">
          <InstallPrompt />
          <JournalComposerBar avatarUrl={viewerAvatar} firstName={viewer.name.split(" ")[0]} />

          {/* Stories — a light bar under the composer */}
          <div className="px-1">
            <StoryBar groups={storyGroups} currentRiderId={viewer.id} canPost currentAvatarUrl={viewerAvatar} />
          </div>

          {/* Following · Discover · Mine */}
          <div className="flex border-b border-border">
            {TABS.map((t) => (
              <Link
                key={t.mode}
                href={t.href}
                className={`flex-1 border-b-2 pb-2.5 text-center text-sm font-semibold transition ${
                  mode === t.mode ? "border-sunset text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {feed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-canvas p-10 text-center">
              {mode === "discover" ? (
                <>
                  <Compass className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-3 text-sm font-medium text-ink">Nothing new to discover right now</p>
                  <p className="mt-1 text-sm text-muted">
                    You&apos;re following everyone who&apos;s posted. Check back as more riders join and share.
                  </p>
                </>
              ) : mode === "mine" ? (
                <>
                  <Users className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-3 text-sm font-medium text-ink">You haven&apos;t posted yet</p>
                  <p className="mt-1 text-sm text-muted">Use the box above to share your first ride.</p>
                </>
              ) : mode === "following" ? (
                <>
                  <Users className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-3 text-sm font-medium text-ink">Your feed is quiet</p>
                  <p className="mt-1 text-sm text-muted">
                    Follow riders and their ride journals show up here. Post your own above, or check For You.
                  </p>
                  <Link
                    href="/feed"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
                  >
                    <Compass className="h-4 w-4" /> See For You
                  </Link>
                </>
              ) : (
                <>
                  <Users className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-3 text-sm font-medium text-ink">No posts yet</p>
                  <p className="mt-1 text-sm text-muted">Be the first — share a ride using the box above.</p>
                </>
              )}
            </div>
          ) : (
            <FeedList key={mode} initial={feed} mode={mode} pageSize={FEED_PAGE_SIZE} />
          )}
        </main>

        {/* Right context column — discovery widgets fill the width */}
        <aside className="hidden space-y-4 lg:block">
          <FeedRightRail viewerId={viewer.id} knownIds={knownIds} />
        </aside>
      </div>
    </AppShell>
  );
}
