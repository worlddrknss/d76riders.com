import { AdminNewsTable } from "@/components/admin/admin-news-table";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsPage() {
  const [posts, categories, tags] = await Promise.all([
    prisma.newsPost.findMany({
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        featured: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        author: { select: { name: true, handle: true } },
        excerpt: true,
        contentHtml: true,
        tags: { select: { tag: { select: { name: true } } } },
        seoTitle: true,
        seoDescription: true,
        coverImageUrl: true,
      },
    }),
    prisma.newsCategory.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.newsTag.findMany({ select: { name: true }, orderBy: { usageCount: "desc" }, take: 50 }),
  ]);

  const tableData = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    featured: post.featured,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
    category: post.category?.name ?? "",
    authorName: post.author?.name ?? "Unknown",
    authorHandle: post.author?.handle ?? "",
    excerpt: post.excerpt ?? "",
    contentHtml: post.contentHtml,
    tags: post.tags.map((t) => t.tag.name).join(", "),
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    hasCoverImage: Boolean(post.coverImageUrl),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Publishing</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">News Management</h1>
        <p className="mt-2 text-sm text-slate-300">Create, edit, and manage blog posts.</p>
      </div>

      <AdminNewsTable
        posts={tableData}
        existingCategories={categories.map((c) => c.name)}
        existingTags={tags.map((t) => t.name)}
      />
    </div>
  );
}
