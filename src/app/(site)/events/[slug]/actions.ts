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

async function requireOrganizerRider(userId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return null;
  return rider;
}

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
      organizers: { some: { rider: { userId } } },
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
      organizers: { some: { rider: { userId }, role: "HOST" } },
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

// ─── Check-in / Check-out ───────────────────────────────────────────

export async function checkInAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await requireOrganizerRider(userId);
  if (!rider) return;

  // Must have RSVP'd GOING
  const rsvp = await prisma.rsvp.findUnique({
    where: { eventId_riderId: { eventId, riderId: rider.id } },
    select: { status: true },
  });
  if (!rsvp || rsvp.status !== "GOING") return;

  await prisma.eventCheckIn.upsert({
    where: { eventId_riderId: { eventId, riderId: rider.id } },
    create: { eventId, riderId: rider.id, method: "QR" },
    update: {},
  });

  revalidatePath("/events");
}

export async function checkOutAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await requireOrganizerRider(userId);
  if (!rider) return;

  await prisma.eventCheckIn.updateMany({
    where: { eventId, riderId: rider.id, checkOutAt: null },
    data: { checkOutAt: new Date() },
  });

  revalidatePath("/events");
}

export async function manualCheckInAction(eventId: string, targetRiderId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  // Only organizers can manually check in riders
  const organizer = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId } },
    select: { id: true },
  });
  if (!organizer) return;

  await prisma.eventCheckIn.upsert({
    where: { eventId_riderId: { eventId, riderId: targetRiderId } },
    create: { eventId, riderId: targetRiderId, method: "MANUAL" },
    update: {},
  });

  revalidatePath("/events");
}

export async function closeRideAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const organizer = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId } },
    select: { id: true },
  });
  if (!organizer) return;

  // Mark event as completed
  await prisma.rideEvent.update({
    where: { id: eventId },
    data: { status: "COMPLETED" },
  });

  // Auto-checkout everyone who hasn't checked out
  await prisma.eventCheckIn.updateMany({
    where: { eventId, checkOutAt: null },
    data: { checkOutAt: new Date() },
  });

  revalidatePath("/events");
}

// ─── Organizer Management ───────────────────────────────────────────

export async function addOrganizerAction(
  eventId: string,
  targetHandle: string,
  role: "LEAD" | "SWEEP" | "MARSHAL",
): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  // Only HOST can add organizers
  const hostOrg = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId }, role: "HOST" },
    select: { id: true },
  });
  if (!hostOrg) return { error: "Only the host can manage organizers." };

  const targetRider = await prisma.rider.findUnique({
    where: { handle: targetHandle },
    select: { id: true },
  });
  if (!targetRider) return { error: "Rider not found." };

  await prisma.eventOrganizer.upsert({
    where: { eventId_riderId: { eventId, riderId: targetRider.id } },
    create: { eventId, riderId: targetRider.id, role },
    update: { role },
  });

  revalidatePath("/events");
  return { error: null };
}

export async function removeOrganizerAction(eventId: string, organizerId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const hostOrg = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId }, role: "HOST" },
    select: { id: true },
  });
  if (!hostOrg) return;

  // Cannot remove the HOST
  const target = await prisma.eventOrganizer.findUnique({
    where: { id: organizerId },
    select: { role: true },
  });
  if (!target || target.role === "HOST") return;

  await prisma.eventOrganizer.delete({ where: { id: organizerId } });
  revalidatePath("/events");
}
