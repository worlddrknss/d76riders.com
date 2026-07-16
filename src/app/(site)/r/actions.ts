"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reportContentAction, type ReportFormState } from "@/app/(site)/report/actions";
import { AuthenticationError, requireUserId } from "@/lib/authz";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { createJournalEntrySchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

export type JournalFormState = {
  error: string | null;
  success: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

// Only persist a video URL if it's a well-formed http(s) URL; drop anything else.
function toOptionalHttpUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export async function createJournalEntryAction(
  _previousState: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;

  try {
    userId = requireUserId(currentUser?.id);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in again.", success: null };
    }

    return { error: "Unable to verify your account.", success: null };
  }

  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const ridePhoto = formData.get("ridePhoto");
  const videoUrl = toOptionalHttpUrl(normalizeText(formData.get("videoUrl")));

  const parsed = createJournalEntrySchema.safeParse({ title: title || "Untitled", body });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true, handle: true },
  });

  if (!rider) {
    return { error: "No rider profile found for your account yet.", success: null };
  }

  let photoUrl: string | null = null;
  if (!videoUrl && ridePhoto instanceof File && ridePhoto.size > 0) {
    if (!allowedImageTypes.has(ridePhoto.type)) {
      return { error: "Ride photo must be a JPG, PNG, or WebP image.", success: null };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet.", success: null };
    }

    let secureUpload: { buffer: Buffer; ext: string; contentType: string };
    try {
      secureUpload = await validateAndScanImageUpload(ridePhoto, "riders-journal-photo-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate ride photo upload.", success: null };
    }

    const key = `journal/${rider.id}/${crypto.randomUUID()}.${secureUpload.ext}`;
    photoUrl = await uploadFile(key, secureUpload.buffer, secureUpload.contentType);
  }

  await prisma.journalEntry.create({
    data: {
      authorId: rider.id,
      title: title || null,
      body,
      videoUrl,
      galleryItems: photoUrl
        ? {
            create: {
              url: photoUrl,
              caption: title || "Ride journal photo",
            },
          }
        : undefined,
    },
  });

  revalidatePath("/r", "layout");
  revalidatePath(`/r/${rider.handle}`);

  return { error: null, success: "Ride history entry published." };
}

export async function updateJournalEntryAction(entryId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const entry = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      author: { userId },
    },
    include: {
      galleryItems: true,
      author: { select: { id: true } },
    },
  });

  if (!entry) {
    redirect("/r");
  }

  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const ridePhoto = formData.get("ridePhoto");
  const removePhoto = formData.get("removePhoto") === "on";
  const videoUrl = toOptionalHttpUrl(normalizeText(formData.get("videoUrl")));

  if (!body) {
    return;
  }

  const previousPhotoUrls = entry.galleryItems.map((item) => item.url);
  let nextPhotoUrl: string | null = null;

  if (ridePhoto instanceof File && ridePhoto.size > 0) {
    if (allowedImageTypes.has(ridePhoto.type) && isS3Configured()) {
      try {
        const secureUpload = await validateAndScanImageUpload(ridePhoto, "riders-journal-photo-update");
        const key = `journal/${entry.author.id}/${crypto.randomUUID()}.${secureUpload.ext}`;
        nextPhotoUrl = await uploadFile(key, secureUpload.buffer, secureUpload.contentType);
      } catch {
        nextPhotoUrl = null;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.update({
      where: { id: entry.id },
      data: {
        title: title || null,
        body,
        videoUrl,
      },
    });

    if (nextPhotoUrl || removePhoto) {
      await tx.galleryItem.deleteMany({ where: { journalEntryId: entry.id } });
      if (nextPhotoUrl) {
        await tx.galleryItem.create({
          data: {
            journalEntryId: entry.id,
            url: nextPhotoUrl,
            caption: title || "Ride journal photo",
          },
        });
      }
    }
  });

  if (nextPhotoUrl || removePhoto) {
    await deleteFilesByUrls(previousPhotoUrls);
  }

  revalidatePath("/r", "layout");
}

export async function deleteJournalEntryAction(entryId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const entry = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      author: { userId },
    },
    include: {
      galleryItems: true,
    },
  });

  if (!entry) {
    redirect("/r");
  }

  const urls = entry.galleryItems.map((item) => item.url);
  await prisma.journalEntry.delete({ where: { id: entry.id } });
  await deleteFilesByUrls(urls);

  revalidatePath("/r", "layout");
}

export type { ReportFormState } from "@/app/(site)/report/actions";

// Kept as the journal-specific entry point for existing callers; the reporting
// logic itself is shared across every content type in the triage queue.
export async function reportJournalEntryAction(
  entryId: string,
  reason: string,
  details: string,
): Promise<ReportFormState> {
  return reportContentAction("JOURNAL_ENTRY", entryId, reason, details);
}
