import { createNewsPostAction } from "@/app/admin/content/new/actions";
import { CreateNewsPostForm } from "@/components/admin/create-news-post-form";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsNewPage() {
  const [categories, tags] = await Promise.all([
    prisma.newsPost.findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
    prisma.newsPost.findMany({ select: { tags: true } }),
  ]);

  const uniqueCategories = categories.map((c) => c.category);
  const uniqueTags = [...new Set(tags.flatMap((t) => t.tags))].sort();

  return (
    <CreateNewsPostForm
      action={createNewsPostAction}
      existingCategories={uniqueCategories}
      existingTags={uniqueTags}
      heading="Create News Post"
      description="Publish a new public news article to the District 76 site."
      submitLabel="Publish News Post"
    />
  );
}
