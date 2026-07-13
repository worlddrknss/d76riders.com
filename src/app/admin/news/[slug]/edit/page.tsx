import { notFound } from "next/navigation";

import { updateNewsPostAction } from "@/app/admin/news/actions";
import { CreateNewsPostForm } from "@/components/admin/create-news-post-form";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, categories, tags] = await Promise.all([
    prisma.newsPost.findUnique({
      where: { slug },
      include: { postTags: { include: { tag: { select: { name: true } } } } },
    }),
    prisma.newsCategory.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.newsTag.findMany({ select: { name: true }, orderBy: { usageCount: "desc" }, take: 50 }),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <CreateNewsPostForm
      action={updateNewsPostAction.bind(null, post.slug)}
      existingCategories={categories.map((c) => c.name)}
      existingTags={tags.map((t) => t.name)}
      heading="Edit News Post"
      description="Update public news content, publishing state, SEO metadata, and featured placement."
      submitLabel="Save News Post"
      initialValues={{
        title: post.title,
        category: post.category,
        tags: post.postTags.map((pt) => pt.tag.name).join(", "),
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
