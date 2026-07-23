import Link from "next/link";

import { deleteCategoryAction } from "@/app/admin/news/categories/actions";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.newsCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Content</p>
          <h1 className="mt-2 font-display text-3xl text-white">News Categories</h1>
          <p className="mt-2 text-sm text-slate-300">Manage categories used to organize news articles.</p>
        </div>
        <Link href="/admin/news/categories/new" className="rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85">
          New Category
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/3 shadow-lg">
        <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Posts</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No categories yet.</td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3 font-semibold text-white">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-400">/{cat.slug}</td>
                  <td className="px-4 py-3 text-slate-400">{cat.description || "—"}</td>
                  <td className="px-4 py-3">{cat._count.posts}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/news/categories/${cat.id}/edit`} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5">
                        Edit
                      </Link>
                      <form action={deleteCategoryAction.bind(null, cat.id)}>
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
