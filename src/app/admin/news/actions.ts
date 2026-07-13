"use server";

import crypto from "node:crypto";

import { NewsPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { deleteFileByUrl, isS3Configured, uploadFile } from "@/lib/s3";

export type UpdateNewsPostFormState = {
  error: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function toOptionalDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export async function updateNewsPostAction(
  slug: string,
  _previousState: UpdateNewsPostFormState,
  formData: FormData,
): Promise<UpdateNewsPostFormState> {
  await requireAdminUserId();

  const post = await prisma.newsPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
    },
  });

  if (!post) {
    return { error: "News post not found." };
  }

  const title = normalizeText(formData.get("title"));
  const category = normalizeText(formData.get("category"));
  const excerpt = normalizeText(formData.get("excerpt"));
  const contentHtml = normalizeText(formData.get("contentHtml"));
  const tagsInput = normalizeText(formData.get("tags"));
  const statusInput = normalizeText(formData.get("status"));
  const publishedAtInput = normalizeText(formData.get("publishedAt"));
  const seoTitle = normalizeText(formData.get("seoTitle"));
  const seoDescription = normalizeText(formData.get("seoDescription"));
  const featured = formData.get("featured") === "on";
  const coverImage = formData.get("coverImage");
  const removeCoverImage = formData.get("removeCoverImage") === "on";

  if (!title || !category || !excerpt || !contentHtml) {
    return { error: "Title, category, excerpt, and body are required." };
  }

  const tags = tagsInput
    ? tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
    : [];

  const status = statusInput === "DRAFT" ? NewsPostStatus.DRAFT : NewsPostStatus.PUBLISHED;
  const publishedAt = toOptionalDate(publishedAtInput) ?? new Date();

  let nextCoverImageUrl = post.coverImageUrl;

  if (coverImage instanceof File && coverImage.size > 0) {
    if (!allowedImageTypes.has(coverImage.type)) {
      return { error: "Cover image must be a JPG, PNG, or WebP image." };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet." };
    }

    const raw = Buffer.from(await coverImage.arrayBuffer());
    const optimized = await optimizeImage(raw);
    const key = `news/${post.slug}-${crypto.randomUUID()}.${optimized.ext}`;
    nextCoverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  if (removeCoverImage && !(coverImage instanceof File && coverImage.size > 0)) {
    nextCoverImageUrl = null;
  }

  // Auto-create/upsert tags
  const tagIds: string[] = [];
  for (const tagName of tags) {
    const tagSlug = toSlug(tagName);
    if (!tagSlug) continue;
    const tag = await prisma.newsTag.upsert({
      where: { slug: tagSlug },
      create: { name: tagName, slug: tagSlug, usageCount: 1 },
      update: { usageCount: { increment: 1 } },
    });
    tagIds.push(tag.id);
  }

  // Resolve category
  const categoryRecord = category
    ? await prisma.newsCategory.findFirst({ where: { OR: [{ name: category }, { slug: toSlug(category) }] } })
    : null;

  // Remove old tag links and re-create
  await prisma.newsPostTag.deleteMany({ where: { postId: post.id } });

  await prisma.newsPost.update({
    where: { id: post.id },
    data: {
      title,
      categoryId: categoryRecord?.id ?? null,
      category,
      excerpt,
      contentHtml,
      status,
      publishedAt,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      featured,
      coverImageUrl: nextCoverImageUrl,
      postTags: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });

  if (post.coverImageUrl && post.coverImageUrl !== nextCoverImageUrl) {
    await deleteFileByUrl(post.coverImageUrl);
  }

  redirect(`/admin/news/${post.slug}/edit`);
}

export async function deleteNewsPostFromAdminAction(slug: string): Promise<void> {
  await requireAdminUserId();

  const post = await prisma.newsPost.findUnique({
    where: { slug },
    select: { id: true, coverImageUrl: true },
  });

  if (!post) {
    redirect("/admin/news");
  }

  await prisma.newsPost.delete({ where: { id: post.id } });
  await deleteFileByUrl(post.coverImageUrl);

  redirect("/admin/news");
}
