import { notFound } from "next/navigation";

import { updateNewsPostAction } from "@/app/admin/news/actions";
import { CreateNewsPostForm } from "@/components/admin/create-news-post-form";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, categories, tags] = await Promise.all([
    prisma.newsPost.findUnique({ where: { slug } }),
    prisma.newsPost.findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
    prisma.newsPost.findMany({ select: { tags: true } }),
  ]);

  if (!post) {
    notFound();
  }

  const uniqueCategories = categories.map((c) => c.category);
  const uniqueTags = [...new Set(tags.flatMap((t) => t.tags))].sort();

  return (
    <CreateNewsPostForm
      action={updateNewsPostAction.bind(null, post.slug)}
      existingCategories={uniqueCategories}
      existingTags={uniqueTags}
      heading="Edit News Post"
      description="Update public news content, publishing state, SEO metadata, and featured placement."
      submitLabel="Save News Post"
      initialValues={{
        title: post.title,
        category: post.category,
        tags: post.tags.join(", "),
        excerpt: post.excerpt,
        contentHtml: post.contentHtml,
        status: post.status,
        publishedAt: post.publishedAt.toISOString().slice(0, 16),
        seoTitle: post.seoTitle ?? "",
        seoDescription: post.seoDescription ?? "",
        featured: post.featured,
      }}
    />
  );
}
