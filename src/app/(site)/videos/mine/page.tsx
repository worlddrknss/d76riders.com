import { redirect } from "next/navigation";
import { Plus, Trash2, Video } from "lucide-react";

import { addVideoAction, deleteVideoAction } from "@/app/(site)/videos/mine/actions";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { VideoEmbed } from "@/components/videos/video-embed";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function MyVideosPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?next=/videos/mine");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: {
      id: true,
      handle: true,
      videos: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!rider) {
    redirect("/account");
  }

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <RiderSubNav handle={rider.handle} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Videos</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Your Videos</h1>
            <p className="mt-1 text-sm text-muted">
              Paste YouTube or TikTok links. They&apos;ll embed on your profile for other riders to watch.
            </p>
          </div>
        </div>

        {/* Add video form */}
        <form action={addVideoAction} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-asphalt">
            <Plus className="h-4 w-4 text-sunset" /> Add Video
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <input name="url" type="url" required placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..." className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              <input name="title" placeholder="Title (optional)" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="self-end rounded-lg bg-sunset px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#cf5a26]">
              Add
            </button>
          </div>
        </form>

        {/* Video grid */}
        {rider.videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Video className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">No videos yet. Paste a YouTube or TikTok URL above.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rider.videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <VideoEmbed url={video.url} platform={video.platform} />
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{video.title || video.url}</p>
                    <p className="text-xs text-muted">{video.platform} · {video.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <form action={deleteVideoAction.bind(null, video.id)}>
                    <button type="submit" className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50" title="Delete video">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
