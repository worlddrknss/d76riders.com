import type { Metadata } from "next";
import { Hash } from "lucide-react";

import { JournalGrid } from "@/components/profile/journal-grid";
import { mediaUrl } from "@/lib/media-url";
import { normalizeTag } from "@/lib/journal-tags";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const clean = normalizeTag(decodeURIComponent(tag));
  return {
    title: `#${clean}`,
    description: `Ride journal posts tagged #${clean} on District 76 Riders.`,
    alternates: { canonical: `/tags/${clean}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clean = normalizeTag(decodeURIComponent(tag));

  const currentUser = await getCurrentUser();
  const viewer = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const rows = await prisma.journalHashtag.findMany({
    where: { tag: clean },
    orderBy: { entry: { createdAt: "desc" } },
    take: 40,
    select: {
      entry: {
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
          comments: {
            orderBy: { createdAt: "asc" },
            take: 10,
            select: { id: true, body: true, createdAt: true, author: { select: { name: true, handle: true } } },
          },
        },
      },
    },
  });

  const entries = rows.map(({ entry }) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: viewer ? entry.likes.some((l) => l.riderId === viewer.id) : false,
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

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/10 text-sunset">
            <Hash className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">#{clean}</h1>
            <p className="text-sm text-muted">
              {entries.length === 0
                ? "No posts with this tag yet."
                : `${entries.length} ${entries.length === 1 ? "post" : "posts"}`}
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Hash className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">
              Be the first — add <span className="font-semibold text-sunset">#{clean}</span> to a ride journal post.
            </p>
          </div>
        ) : (
          <JournalGrid
            entries={entries}
            isOwner={false}
            isAuthenticated={Boolean(currentUser)}
            layout="feed"
          />
        )}
      </div>
    </section>
  );
}
