import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminCategoriesTable, type AdminCategoryRow } from "@/components/admin/admin-categories-table";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.newsCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  const rows: AdminCategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    postCount: category._count.posts,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Content</p>
          <h1 className="mt-2 font-display text-3xl text-white">Magazine Categories</h1>
          <p className="mt-2 text-sm text-slate-300">
            How articles are filed on the magazine. Deleting one leaves its articles published but
            uncategorised.
          </p>
        </div>
        <Link
          href="/admin/news/categories/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
        >
          <Plus className="h-4 w-4" />
          New Category
        </Link>
      </div>

      <AdminCategoriesTable categories={rows} />
    </div>
  );
}
