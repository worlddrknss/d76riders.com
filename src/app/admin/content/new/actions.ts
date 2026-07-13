"use server";

import crypto from "node:crypto";

import { NewsPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isS3Configured, uploadFile } from "@/lib/s3";

export type CreateNewsPostFormState = {
  error: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function toOptionalDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function buildUniqueNewsSlug(baseTitle: string): Promise<string> {
  const baseSlug = toSlug(baseTitle) || `news-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.newsPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createNewsPostAction(
  _previousState: CreateNewsPostFormState,
  formData: FormData,
): Promise<CreateNewsPostFormState> {
  const currentUser = await getCurrentUser();

  try {
    await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in again." };
    }

    if (error instanceof AuthorizationError) {
      return { error: "You do not have permission to publish news posts." };
    }

    return { error: "Unable to verify your account permissions right now." };
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

  if (!title || !category || !excerpt || !contentHtml) {
    return { error: "Title, category, excerpt, and body are required." };
  }

  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const status = statusInput === "DRAFT" ? NewsPostStatus.DRAFT : NewsPostStatus.PUBLISHED;
  const publishedAt = toOptionalDate(publishedAtInput) ?? new Date();

  const slug = await buildUniqueNewsSlug(title);
  let coverImageUrl: string | null = null;

  if (coverImage instanceof File && coverImage.size > 0) {
    if (!allowedImageTypes.has(coverImage.type)) {
      return { error: "Cover image must be a JPG, PNG, or WebP image." };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet." };
    }

    let secureUpload: { buffer: Buffer };
    try {
      secureUpload = await validateAndScanImageUpload(coverImage, "admin-content-news-cover-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate cover image upload." };
    }

    const optimized = await optimizeImage(secureUpload.buffer);
    const key = `news/${slug}-${crypto.randomUUID()}.${optimized.ext}`;
    coverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  // Auto-create tags
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

  await prisma.newsPost.create({
    data: {
      slug,
      authorUserId: currentUser?.id,
      title,
      categoryId: categoryRecord?.id ?? null,
      category,
      excerpt,
      contentHtml,
      authorName: currentUser?.name || currentUser?.handle || "District 76",
      coverImageUrl,
      status,
      publishedAt,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      featured,
      postTags: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });

  redirect(`/news/${slug}`);
}
