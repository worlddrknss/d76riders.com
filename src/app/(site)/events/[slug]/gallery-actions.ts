"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { isGalleryOpen } from "@/lib/event-gallery";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { deleteFileByUrl, deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

/**
 * Add one or more photos to an event's community gallery. Any signed-in rider
 * can contribute; the uploader is credited via `riderId` (the cover flyer is the
 * organizer-set GalleryItem with a null riderId, so the two never mix).
 */
export async function addEventPhotosAction(eventId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!rider) return;
  if (!isS3Configured()) return;

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, title: true, status: true, galleryClosesAt: true },
  });
  if (!event) return;
  // Gallery closed (past its grace deadline, or the ride was closed) — no uploads.
  if (!isGalleryOpen(event)) return;

  const caption = (formData.get("caption")?.toString() ?? "").trim().slice(0, 200) || null;
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  let uploaded = 0;
  for (const file of files.slice(0, 10)) {
    if (!allowedImageTypes.has(file.type)) continue;
    let storedUrl: string | null = null;
    try {
      const secure = await validateAndScanImageUpload(file, "event-gallery-photo");
      const optimized = await optimizeImage(secure.buffer);
      const key = `events/${event.id}/${crypto.randomUUID()}.${optimized.ext}`;
      storedUrl = await uploadFile(key, optimized.data, optimized.contentType);
      await prisma.galleryItem.create({
        data: { eventId: event.id, riderId: rider.id, url: storedUrl, caption },
      });
      uploaded += 1;
    } catch {
      // Skip a bad file rather than failing the whole batch — but if the upload
      // landed and only the row failed, take the object back out. Silently
      // skipping there is what leaves a file nothing will ever reference.
      // deleteFileByUrl can itself throw; letting that escape a catch block
      // would abandon the rest of the batch over a cleanup failure.
      if (storedUrl) await deleteFilesByUrls([storedUrl]);
    }
  }

  if (uploaded > 0) {
    await logActivity({
      riderId: rider.id,
      type: "UPLOADED_PHOTO",
      summary: `Added ${uploaded} photo${uploaded === 1 ? "" : "s"} to ${event.title}`,
      refId: event.id,
    });
    revalidatePath(`/events/${event.slug}`);
  }
}

/** Remove a gallery photo — the uploader, an event organizer, or an admin/mod. */
export async function deleteEventPhotoAction(photoId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });

  const photo = await prisma.galleryItem.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      url: true,
      riderId: true,
      eventId: true,
      event: { select: { slug: true, organizers: { select: { riderId: true } } } },
    },
  });
  if (!photo || !photo.eventId || !photo.event) return;

  const isUploader = rider != null && photo.riderId === rider.id;
  const isOrganizer = rider != null && photo.event.organizers.some((o) => o.riderId === rider.id);
  const isStaff =
    currentUser.roles.includes("ADMINISTRATOR") || currentUser.roles.includes("MODERATOR");
  if (!isUploader && !isOrganizer && !isStaff) return;

  await prisma.galleryItem.delete({ where: { id: photo.id } });
  await deleteFileByUrl(photo.url);
  revalidatePath(`/events/${photo.event.slug}`);
}
