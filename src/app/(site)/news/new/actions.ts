"use server";

import crypto from "node:crypto";

import { NewsPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { isS3Configured, uploadFile } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

export type SubmitNewsFormState = { error: string | null };

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

async function buildUniqueNewsSlug(baseTitle: string): Promise<string> {
  const baseSlug = toSlug(baseTitle) || `news-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;
  while (true) {
    const existing = await prisma.newsPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function upsertTags(tagNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames) {
    const slug = toSlug(name);
    if (!slug) continue;
    const tag = await prisma.newsTag.upsert({
      where: { slug },
      create: { name, slug, usageCount: 1 },
      update: { usageCount: { increment: 1 } },
    });
    ids.push(tag.id);
  }
  return ids;
}

export async function submitNewsAction(
  _prev: SubmitNewsFormState,
  formData: FormData,
): Promise<SubmitNewsFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Please log in to submit an article." };

  const title = normalizeText(formData.get("title"));
  const categoryId = normalizeText(formData.get("categoryId"));
  const excerpt = normalizeText(formData.get("excerpt"));
  const contentHtml = normalizeText(formData.get("contentHtml"));
  const tagsInput = normalizeText(formData.get("tags"));
  const coverImage = formData.get("coverImage");

  if (!title || !categoryId || !excerpt || !contentHtml) {
    return { error: "Title, category, excerpt, and body are required." };
  }

  const category = await prisma.newsCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!category) return { error: "Invalid category." };

  const tagNames = tagsInput
    ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)
    : [];

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
      secureUpload = await validateAndScanImageUpload(coverImage, "news-cover-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate cover image upload." };
    }

    const optimized = await optimizeImage(secureUpload.buffer);
    const key = `news/${slug}-${crypto.randomUUID()}.${optimized.ext}`;
    coverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  const tagIds = await upsertTags(tagNames);

  await prisma.newsPost.create({
    data: {
      slug,
      authorUserId: currentUser.id,
      title,
      categoryId: category.id,
      category: category.name,
      excerpt,
      contentHtml,
      authorName: currentUser.name || currentUser.handle || "Community Member",
      coverImageUrl,
      status: NewsPostStatus.PENDING_REVIEW,
      postTags: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });

  redirect("/news?submitted=1");
}
