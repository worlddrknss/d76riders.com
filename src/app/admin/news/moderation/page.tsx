import Link from "next/link";
import { NewsPostStatus } from "@prisma/client";

import { ModerationActions } from "@/components/admin/moderation-actions";
import { prisma } from "@/lib/prisma";

export default async function ModerationPage() {
  const pendingPosts = await prisma.newsPost.findMany({
    where: { status: NewsPostStatus.PENDING_REVIEW },
    orderBy: { createdAt: "asc" },
    include: {
      authorUser: { select: { name: true, email: true } },
      newsCategory: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Content</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Moderation Queue</h1>
        <p className="mt-2 text-sm text-slate-300">
          {pendingPosts.length === 0
            ? "No articles pending review."
            : `${pendingPosts.length} article${pendingPosts.length > 1 ? "s" : ""} awaiting review.`}
        </p>
      </div>

      {pendingPosts.length > 0 ? (
        <div className="space-y-4">
          {pendingPosts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/news/${post.slug}/edit`} className="font-display text-lg font-semibold text-white hover:text-sunset">
                    {post.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>by {post.authorUser?.name || post.authorName}</span>
                    {post.newsCategory ? <span className="rounded bg-white/10 px-2 py-0.5">{post.newsCategory.name}</span> : null}
                    <span>Submitted {post.createdAt.toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{post.excerpt}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <ModerationActions postId={post.id} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
