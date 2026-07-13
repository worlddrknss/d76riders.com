import Link from "next/link";

import { deleteNewsPostFromAdminAction } from "@/app/admin/news/actions";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsPage() {
  const posts = await prisma.newsPost.findMany({
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Publishing</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">News Posts</h1>
          <p className="mt-2 text-sm text-slate-300">Manage published and draft news content.</p>
        </div>
        <Link href="/admin/news/new" className="rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85">
          Create News Post
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/3 shadow-lg">
        <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Featured</th>
              <th className="px-4 py-3 text-left">Published</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No news posts yet.</td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{post.title}</p>
                      <p className="text-xs text-slate-400">/{post.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      post.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-300"
                        : post.status === "PENDING_REVIEW" ? "bg-amber-500/15 text-amber-300"
                        : post.status === "REJECTED" ? "bg-red-500/15 text-red-300"
                        : "bg-white/10 text-slate-300"
                    }`}>
                      {post.status === "PENDING_REVIEW" ? "Pending" : post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{post.featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{post.publishedAt.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/news/${post.slug}/edit`} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5">
                        Edit
                      </Link>
                      <Link href={`/news/${post.slug}`} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5">
                        View
                      </Link>
                      <form action={deleteNewsPostFromAdminAction.bind(null, post.slug)}>
                        <button className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
