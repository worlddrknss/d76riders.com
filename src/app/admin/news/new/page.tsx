import { createNewsPostAction } from "@/app/admin/content/new/actions";
import { CreateNewsPostForm } from "@/components/admin/create-news-post-form";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsNewPage() {
  const [categories, tags] = await Promise.all([
    prisma.newsCategory.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.newsTag.findMany({ select: { name: true }, orderBy: { usageCount: "desc" }, take: 50 }),
  ]);

  return (
    <CreateNewsPostForm
      action={createNewsPostAction}
      existingCategories={categories.map((c) => c.name)}
      existingTags={tags.map((t) => t.name)}
      heading="Create News Post"
      description="Publish a new public news article to the District 76 site."
      submitLabel="Publish News Post"
    />
  );
}
