"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

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

function toOptionalInt(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalUrl(value: string): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findFirst({
    where: {
      id: eventId,
      host: { userId },
    },
    include: {
      galleryItems: true,
      route: true,
      host: { select: { id: true } },
    },
  });

  if (!event) {
    redirect("/events");
  }

  const title = normalizeText(formData.get("title"));
  const excerpt = normalizeText(formData.get("excerpt"));
  const description = normalizeText(formData.get("description"));
  const startsAt = toOptionalDate(normalizeText(formData.get("startsAt")));
  const ksuAt = toOptionalDate(normalizeText(formData.get("ksuAt")));
  const meetLocation = normalizeText(formData.get("meetLocation"));
  const ksuLocation = normalizeText(formData.get("ksuLocation"));
  const facebookEventUrlInput = normalizeText(formData.get("facebookEventUrl"));
  const distanceMiles = toOptionalInt(normalizeText(formData.get("distanceMiles")));
  const difficultyInput = normalizeText(formData.get("difficulty"));
  const removeRoute = formData.get("removeRoute") === "on";
  const eventPhoto = formData.get("eventPhoto");
  const removePhoto = formData.get("removePhoto") === "on";

  if (!title || !startsAt) {
    redirect(`/events/${event.slug}`);
  }

  const facebookEventUrl = toOptionalUrl(facebookEventUrlInput);
  if (facebookEventUrlInput && !facebookEventUrl) {
    redirect(`/events/${event.slug}`);
  }

  const difficulty = difficultyInput ? (difficultyInput as RideDifficulty) : null;
  const previousPhotoUrls = event.galleryItems.map((item) => item.url);
  let nextPhotoUrl: string | null = null;

  if (eventPhoto instanceof File && eventPhoto.size > 0) {
    if (allowedImageTypes.has(eventPhoto.type) && isS3Configured()) {
      try {
        const secureUpload = await validateAndScanImageUpload(eventPhoto, "events-photo-update");
        const optimized = await optimizeImage(secureUpload.buffer);
        const key = `events/${event.host.id}/${event.slug}-${crypto.randomUUID()}.${optimized.ext}`;
        nextPhotoUrl = await uploadFile(key, optimized.data, optimized.contentType);
      } catch {
        nextPhotoUrl = null;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rideEvent.update({
      where: { id: event.id },
      data: {
        title,
        excerpt: excerpt ? excerpt.slice(0, 255) : null,
        description: description || null,
        startsAt,
        ksuAt,
        meetLocation: meetLocation || null,
        ksuLocation: ksuLocation || null,
        facebookEventUrl,
        distanceMiles,
        difficulty,
        routeId: removeRoute ? null : undefined,
      },
    });

    if (removeRoute && event.routeId) {
      await tx.route.delete({ where: { id: event.routeId } });
    }

    if (nextPhotoUrl || removePhoto) {
      await tx.galleryItem.deleteMany({ where: { eventId: event.id } });
      if (nextPhotoUrl) {
        await tx.galleryItem.create({
          data: {
            eventId: event.id,
            url: nextPhotoUrl,
            caption: `${title} cover image`,
          },
        });
      }
    }
  });

  if (nextPhotoUrl || removePhoto) {
    await deleteFilesByUrls(previousPhotoUrls);
  }

  revalidatePath(`/events/${event.slug}`);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findFirst({
    where: {
      id: eventId,
      host: { userId },
    },
    include: {
      galleryItems: true,
    },
  });

  if (!event) {
    redirect("/events");
  }

  const urls = event.galleryItems.map((item) => item.url);

  await prisma.$transaction(async (tx) => {
    // Delete related records that may not cascade automatically
    await tx.rsvp.deleteMany({ where: { eventId: event.id } });
    await tx.eventFollow.deleteMany({ where: { eventId: event.id } });
    await tx.galleryItem.deleteMany({ where: { eventId: event.id } });
    await tx.rideEvent.delete({ where: { id: event.id } });
    if (event.routeId) {
      await tx.route.delete({ where: { id: event.routeId } });
    }
  });

  await deleteFilesByUrls(urls);
  revalidatePath("/events");
}

export async function rsvpAction(eventId: string, status: "GOING" | "CANCEL"): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!rider) {
    return;
  }

  if (status === "CANCEL") {
    await prisma.rsvp.deleteMany({
      where: { eventId, riderId: rider.id },
    });
  } else {
    await prisma.rsvp.upsert({
      where: { eventId_riderId: { eventId, riderId: rider.id } },
      create: { eventId, riderId: rider.id, status: "GOING" },
      update: { status: "GOING" },
    });
  }

  revalidatePath("/events");
}
