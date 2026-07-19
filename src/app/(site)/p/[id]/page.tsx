import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalGrid } from "@/components/profile/journal-grid";
import { absoluteUrl } from "@/lib/absolute-url";
import { mediaUrl } from "@/lib/media-url";
import { OG_IMAGE } from "@/lib/og";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ENTRY_SELECT = {
  id: true,
  title: true,
  body: true,
  videoUrl: true,
  createdAt: true,
  authorId: true,
  author: { select: { name: true, handle: true, avatarUrl: true } },
  galleryItems: { orderBy: { createdAt: "asc" as const }, take: 1, select: { url: true } },
  _count: { select: { likes: true, comments: true } },
  likes: { select: { riderId: true } },
  saves: { select: { riderId: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    take: 50,
    select: { id: true, body: true, createdAt: true, author: { select: { name: true, handle: true } } },
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    select: { title: true, body: true, author: { select: { name: true } }, galleryItems: { take: 1, select: { url: true } } },
  });
  if (!entry) return { title: "Post not found — D76 Riders" };

  const title = entry.title || `${entry.author.name} on District 76`;
  const description = entry.body.slice(0, 160);
  const image = entry.galleryItems[0]?.url ? absoluteUrl(mediaUrl(entry.galleryItems[0].url) ?? "") : OG_IMAGE;
  return {
    title: `${title} — D76 Riders`,
    description,
    openGraph: { title, description, images: image, type: "article" },
    twitter: { card: "summary_large_image", title, description, images: image },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const entry = await prisma.journalEntry.findUnique({ where: { id }, select: ENTRY_SELECT });
  if (!entry) notFound();

  const currentUser = await getCurrentUser();
  const viewer = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const gridEntry = {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: viewer ? entry.likes.some((l) => l.riderId === viewer.id) : false,
    isSaved: viewer ? entry.saves.some((s) => s.riderId === viewer.id) : false,
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
  };

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-2xl">
        <JournalGrid
          entries={[gridEntry]}
          isOwner={Boolean(viewer && viewer.id === entry.authorId)}
          isAuthenticated={Boolean(viewer)}
          layout="feed"
        />
      </div>
    </section>
  );
}
