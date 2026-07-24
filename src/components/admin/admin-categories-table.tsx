"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCategoryAction } from "@/app/admin/news/categories/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";

/**
 * Magazine categories.
 *
 * Delete used to be a bare form button: one click, no confirmation, no warning
 * that articles were attached. The relation is onDelete: SetNull, so the posts
 * survive but come out of the category and stop being reachable by it — worth
 * knowing before you click, especially on a category carrying five articles.
 */
export function AdminCategoriesTable({ categories }: { categories: AdminCategoryRow[] }) {
  const columns: AdminColumn<AdminCategoryRow>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (c) => c.name.toLowerCase(),
      searchValue: (c) => `${c.name} ${c.slug} ${c.description ?? ""}`,
      cell: (category) => (
        <div className="min-w-0">
          <p className="font-semibold text-white">{category.name}</p>
          <p className="truncate text-xs text-slate-500">/{category.slug}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (category) =>
        category.description ? (
          <span className="text-slate-300">{category.description}</span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "posts",
      header: "Articles",
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      sortValue: (c) => c.postCount,
      cell: (category) =>
        category.postCount > 0 ? category.postCount : <span className="text-slate-600">0</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (category) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/news/categories/${category.id}/edit`}
            className={iconButton}
            title={`Edit ${category.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <AdminConfirm
            title="Delete this category?"
            confirmLabel="Delete category"
            body={
              category.postCount > 0 ? (
                <>
                  <span className="font-semibold text-white">{category.postCount}</span> article
                  {category.postCount === 1 ? "" : "s"} filed under{" "}
                  <span className="font-semibold text-white">{category.name}</span> stay published, but come
                  out of the category — nobody browsing by it will find them again.
                </>
              ) : (
                <>
                  <span className="font-semibold text-white">{category.name}</span> has no articles in it, so
                  nothing else changes.
                </>
              )
            }
            onConfirm={() => deleteCategoryAction(category.id)}
            trigger={(open, pending) => (
              <button
                type="button"
                onClick={open}
                disabled={pending}
                title={`Delete ${category.name}`}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      rows={categories}
      columns={columns}
      rowKey={(category) => category.id}
      searchPlaceholder="Search categories…"
      emptyMessage="No categories yet."
    />
  );
}
