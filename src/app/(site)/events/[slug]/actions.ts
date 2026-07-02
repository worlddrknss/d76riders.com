"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
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

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const description = normalizeText(formData.get("description"));
  const startsAt = toOptionalDate(normalizeText(formData.get("startsAt")));
  const ksuAt = toOptionalDate(normalizeText(formData.get("ksuAt")));
  const meetLocation = normalizeText(formData.get("meetLocation"));
  const ksuLocation = normalizeText(formData.get("ksuLocation"));
  const distanceMiles = toOptionalInt(normalizeText(formData.get("distanceMiles")));
  const difficultyInput = normalizeText(formData.get("difficulty"));
  const removeRoute = formData.get("removeRoute") === "on";
  const eventPhoto = formData.get("eventPhoto");
  const removePhoto = formData.get("removePhoto") === "on";

  if (!title || !startsAt) {
    redirect(`/events/${event.slug}`);
  }

  const difficulty = difficultyInput ? (difficultyInput as RideDifficulty) : null;
  const previousPhotoUrls = event.galleryItems.map((item) => item.url);
  let nextPhotoUrl: string | null = null;

  if (eventPhoto instanceof File && eventPhoto.size > 0) {
    if (allowedImageTypes.has(eventPhoto.type) && isS3Configured()) {
      const ext = eventPhoto.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const key = `events/${event.host.id}/${event.slug}-${crypto.randomUUID()}.${ext}`;
      nextPhotoUrl = await uploadFile(key, Buffer.from(await eventPhoto.arrayBuffer()), eventPhoto.type);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rideEvent.update({
      where: { id: event.id },
      data: {
        title,
        description: description || null,
        startsAt,
        ksuAt,
        meetLocation: meetLocation || null,
        ksuLocation: ksuLocation || null,
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

  redirect(`/events/${event.slug}`);
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
    await tx.rideEvent.delete({ where: { id: event.id } });
    if (event.routeId) {
      await tx.route.delete({ where: { id: event.routeId } });
    }
  });

  await deleteFilesByUrls(urls);
  redirect("/events");
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
