"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  if (ridePhoto instanceof File && ridePhoto.size > 0) {
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

  revalidatePath("/riders", "layout");
  revalidatePath(`/riders/${rider.handle}`);

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
    redirect("/riders");
  }

  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const ridePhoto = formData.get("ridePhoto");
  const removePhoto = formData.get("removePhoto") === "on";

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

  revalidatePath("/riders", "layout");
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
    redirect("/riders");
  }

  const urls = entry.galleryItems.map((item) => item.url);
  await prisma.journalEntry.delete({ where: { id: entry.id } });
  await deleteFilesByUrls(urls);

  revalidatePath("/riders", "layout");
}

export type ReportFormState = {
  error: string | null;
  success: string | null;
};

export async function reportJournalEntryAction(
  entryId: string,
  reason: string,
  details: string,
): Promise<ReportFormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return { error: "Please log in to report content.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!rider) {
    return { error: "No rider profile found.", success: null };
  }

  const validReasons = ["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "OTHER"];
  if (!validReasons.includes(reason)) {
    return { error: "Please select a valid reason.", success: null };
  }

  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: { id: true },
  });

  if (!entry) {
    return { error: "Journal entry not found.", success: null };
  }

  const existing = await prisma.report.findFirst({
    where: { reporterId: rider.id, journalEntryId: entryId, status: "PENDING" },
  });

  if (existing) {
    return { error: "You've already reported this entry.", success: null };
  }

  await prisma.report.create({
    data: {
      reporterId: rider.id,
      journalEntryId: entryId,
      reason: reason as "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "MISINFORMATION" | "OTHER",
      details: details.trim() || null,
    },
  });

  return { error: null, success: "Report submitted. A moderator will review it." };
}
