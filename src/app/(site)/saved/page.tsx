import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { JournalGrid } from "@/components/profile/journal-grid";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved — D76 Riders",
  description: "Ride journal posts you've saved to revisit.",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?next=/saved");
  }

  const viewer = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });
  if (!viewer) {
    redirect("/login?next=/saved");
  }

  const rows = await prisma.save.findMany({
    where: { riderId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      journalEntry: {
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

  const entries = rows.map(({ journalEntry: entry }) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: entry.likes.some((l) => l.riderId === viewer.id),
    isSaved: true,
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
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink/10 text-ink">
            <Bookmark className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl text-ink">Saved</h1>
            <p className="text-sm text-muted">
              {entries.length === 0
                ? "Posts you save show up here — just you."
                : `${entries.length} saved ${entries.length === 1 ? "post" : "posts"} · only you can see this`}
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">
              Tap <span className="font-semibold text-ink">Save</span> on any ride journal post to keep it here.
            </p>
          </div>
        ) : (
          <JournalGrid entries={entries} isOwner={false} isAuthenticated layout="feed" />
        )}
      </div>
    </AppShell>
  );
}
