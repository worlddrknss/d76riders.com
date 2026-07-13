import { notFound } from "next/navigation";

import { updateCategoryAction } from "@/app/admin/news/categories/actions";
import { CategoryForm } from "@/components/admin/category-form";
import { prisma } from "@/lib/prisma";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await prisma.newsCategory.findUnique({ where: { id } });
  if (!category) notFound();

  const boundAction = updateCategoryAction.bind(null, category.id);

  return (
    <CategoryForm
      action={boundAction}
      heading={`Edit: ${category.name}`}
      submitLabel="Save Changes"
      initialValues={{ name: category.name, description: category.description ?? "" }}
    />
  );
}
