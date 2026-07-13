import { createCategoryAction } from "@/app/admin/news/categories/actions";
import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <CategoryForm
      action={createCategoryAction}
      heading="New Category"
      submitLabel="Create Category"
    />
  );
}
