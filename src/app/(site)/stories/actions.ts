"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/authz";
import { validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { deleteFileByUrl, isS3Configured, uploadFile } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

export type StoryFormState = { error: string | null; success: string | null };

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

// Post an ephemeral story — a scanned, S3-stored photo that expires in 24h.
export async function createStoryAction(
  _prev: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Sign in to post a story.", success: null };
  }

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return { error: "Rider profile not found.", success: null };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Choose a photo to share.", success: null };
  }
  if (!isS3Configured()) {
    return { error: "Storage is not configured for uploads yet.", success: null };
  }

  let secureUpload: { buffer: Buffer; ext: string; contentType: string };
  try {
    secureUpload = await validateAndScanImageUpload(photo, "stories-create");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to validate photo.",
      success: null,
    };
  }

  const key = `stories/${rider.id}/${crypto.randomUUID()}.${secureUpload.ext}`;
  const url = await uploadFile(key, secureUpload.buffer, secureUpload.contentType);

  const caption = (formData.get("caption")?.toString() ?? "").trim().slice(0, 140) || null;

  await prisma.story.create({
    data: {
      riderId: rider.id,
      url,
      caption,
      expiresAt: new Date(Date.now() + STORY_TTL_MS),
    },
  });

  revalidatePath("/", "layout");
  return { error: null, success: "Story posted — it'll be up for 24 hours." };
}

// Remove one of your own stories early (also deletes the S3 object).
export async function deleteStoryAction(storyId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return;

  const story = await prisma.story.findFirst({
    where: { id: storyId, riderId: rider.id },
    select: { id: true, url: true },
  });
  if (!story) return;

  await prisma.story.delete({ where: { id: story.id } });
  await deleteFileByUrl(story.url);

  revalidatePath("/", "layout");
}
