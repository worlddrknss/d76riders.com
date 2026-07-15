import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";

import { VideoEmbed } from "@/components/videos/video-embed";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const rider = await prisma.rider.findUnique({ where: { handle }, select: { name: true } });
  if (!rider) return { title: "Rider Not Found" };
  return {
    title: `${rider.name}'s Videos — District 76 Riders`,
    description: `Watch ${rider.name}'s ride videos on District 76 Riders.`,
  };
}

export default async function PublicVideosPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const currentUser = await getCurrentUser();

  const rider = await prisma.rider.findUnique({
    where: { handle },
    select: {
      id: true,
      userId: true,
      name: true,
      handle: true,
      videos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!rider) notFound();

  const isOwner = currentUser?.id === rider.userId;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href={`/r/${rider.handle}`} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-sunset hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              {rider.name}&apos;s Profile
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{rider.name}&apos;s Videos</h1>
            <p className="mt-1 text-sm text-muted">{rider.videos.length} {rider.videos.length === 1 ? "video" : "videos"}</p>
          </div>
          {isOwner && (
            <Link href="/videos/mine" className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#cf5a26]">
              Manage Videos
            </Link>
          )}
        </div>

        {rider.videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Video className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">{rider.name} hasn&apos;t added any videos yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rider.videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <VideoEmbed url={video.url} platform={video.platform} />
                <div className="px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{video.title || "Untitled"}</p>
                  <p className="text-xs text-muted">{video.platform} · {video.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
