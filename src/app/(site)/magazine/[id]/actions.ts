"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { getCurrentUser } from "@/lib/session";
import { deleteFileByUrl, isS3Configured, uploadFile } from "@/lib/s3";

export type EditArticleState = { error: string | null; saved?: boolean };

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

/**
 * Edit an article from its own page.
 *
 * The admin console already has an update action, but it is admin-only — an
 * author had no way to fix their own typo without someone with the keys. This
 * one is open to the author or an administrator, and deliberately does not
 * touch status, publish date or featured: those stay editorial decisions made
 * in /admin, so editing a typo can never publish something by accident.
 */
export async function updateArticleAction(
  slug: string,
  _previous: EditArticleState,
  formData: FormData,
): Promise<EditArticleState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return { error: "Please log in again." };

  const post = await prisma.newsPost.findUnique({
    where: { slug },
    select: { id: true, slug: true, coverImageUrl: true, authorUserId: true },
  });
  if (!post) return { error: "Article not found." };

  const isAdmin = currentUser.roles?.includes("ADMINISTRATOR") ?? false;
  if (!isAdmin && post.authorUserId !== currentUser.id) {
    return { error: "Only the author or an administrator can edit this article." };
  }

  const title = normalizeText(formData.get("title"));
  const excerpt = normalizeText(formData.get("excerpt"));
  const contentHtml = sanitizeRichText(normalizeText(formData.get("contentHtml")));
  const categoryId = normalizeText(formData.get("categoryId"));
  const coverImage = formData.get("coverImage");
  const removeCoverImage = formData.get("removeCoverImage") === "on";

  if (!title || !excerpt || !contentHtml) {
    return { error: "Title, excerpt, and body are required." };
  }

  let nextCoverImageUrl = post.coverImageUrl;

  if (coverImage instanceof File && coverImage.size > 0) {
    if (!allowedImageTypes.has(coverImage.type)) {
      return { error: "Cover image must be a JPG, PNG, or WebP image." };
    }
    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet." };
    }
    try {
      const secureUpload = await validateAndScanImageUpload(coverImage, "magazine-cover-update");
      const optimized = await optimizeImage(secureUpload.buffer);
      const key = `news/${post.slug}-${crypto.randomUUID()}.${optimized.ext}`;
      nextCoverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to process that image." };
    }
  } else if (removeCoverImage) {
    nextCoverImageUrl = null;
  }

  const category = categoryId
    ? await prisma.newsCategory.findUnique({ where: { id: categoryId }, select: { id: true, name: true } })
    : null;

  await prisma.newsPost.update({
    where: { id: post.id },
    data: {
      title,
      excerpt,
      contentHtml,
      coverImageUrl: nextCoverImageUrl,
      ...(category ? { categoryId: category.id, category: category.name } : {}),
    },
  });

  // Only bin the old file once the new one is stored and referenced.
  const previous = post.coverImageUrl;
  if (previous && previous !== nextCoverImageUrl) {
    await deleteFileByUrl(previous);
  }

  revalidatePath(`/magazine/${post.slug}`);
  revalidatePath("/magazine");
  return { error: null, saved: true };
}

export async function deleteNewsPostAction(slug: string): Promise<void> {
  const currentUser = await getCurrentUser();

  try {
    await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/magazine");
    }
    redirect("/magazine");
  }

  const post = await prisma.newsPost.findUnique({
    where: { slug },
    select: {
      id: true,
      coverImageUrl: true,
    },
  });

  if (!post) {
    redirect("/magazine");
  }

  await prisma.newsPost.delete({ where: { id: post.id } });
  await deleteFileByUrl(post.coverImageUrl);

  redirect("/magazine");
}
