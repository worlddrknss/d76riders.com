"use server";

import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function requireAdminUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  try {
    return await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/admin");
    }
    redirect("/admin");
  }
}

export type CategoryFormState = { error: string | null };

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdminUserId();

  const name = (formData.get("name")?.toString() ?? "").trim();
  const description = (formData.get("description")?.toString() ?? "").trim() || null;

  if (!name) return { error: "Category name is required." };

  const slug = toSlug(name);
  if (!slug) return { error: "Category name must contain at least one letter or number." };

  const existing = await prisma.newsCategory.findFirst({
    where: { OR: [{ name }, { slug }] },
    select: { id: true },
  });
  if (existing) return { error: "A category with that name already exists." };

  await prisma.newsCategory.create({ data: { name, slug, description } });
  redirect("/admin/news/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdminUserId();

  const name = (formData.get("name")?.toString() ?? "").trim();
  const description = (formData.get("description")?.toString() ?? "").trim() || null;

  if (!name) return { error: "Category name is required." };

  const slug = toSlug(name);
  const conflict = await prisma.newsCategory.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return { error: "A category with that name already exists." };

  await prisma.newsCategory.update({ where: { id }, data: { name, slug, description } });
  redirect("/admin/news/categories");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdminUserId();

  const postCount = await prisma.newsPost.count({ where: { categoryId: id } });
  if (postCount > 0) {
    // Unlink posts from this category instead of blocking delete
    await prisma.newsPost.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  }

  await prisma.newsCategory.delete({ where: { id } });
  redirect("/admin/news/categories");
}
