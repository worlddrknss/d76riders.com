"use server";

import crypto from "node:crypto";

import { BikeType, ModificationCategory, ServiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { createBikeSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

export type GarageFormState = {
  error: string | null;
  success: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function toOptionalInt(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const allowedBikeTypes = new Set<string>(Object.values(BikeType));
const allowedModificationCategories = new Set<string>(Object.values(ModificationCategory));
const allowedServiceTypes = new Set<string>(Object.values(ServiceType));

async function requireCurrentRider() {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true, handle: true } });

  if (!rider) {
    throw new AuthenticationError("No rider profile found for your account yet.");
  }

  return rider;
}

async function logActivity(riderId: string, type: "ADDED_BIKE" | "ADDED_MODIFICATION" | "LOGGED_SERVICE" | "UPLOADED_PHOTO" | "FOLLOWED_RIDER" | "FAVORITED_BUILD", summary: string, refId?: string) {
  await prisma.activity.create({
    data: {
      riderId,
      type,
      summary,
      refId,
    },
  });
}

export async function createBikeAction(
  _previousState: GarageFormState,
  formData: FormData,
): Promise<GarageFormState> {
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

  const name = normalizeText(formData.get("name"));
  const make = normalizeText(formData.get("make"));
  const model = normalizeText(formData.get("model"));
  const yearInput = normalizeText(formData.get("year"));
  const typeInput = normalizeText(formData.get("type"));
  const engineType = normalizeText(formData.get("engineType"));
  const displacement = normalizeText(formData.get("displacement"));
  const bikePhoto = formData.get("bikePhoto");

  const parsed = createBikeSchema.safeParse({
    name,
    make,
    model: model || undefined,
    year: yearInput ? Number(yearInput) : undefined,
    type: typeInput || undefined,
    engineType: engineType || undefined,
    displacement: displacement || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: null };
  }

  const year = toOptionalInt(yearInput);
  const type = typeInput && allowedBikeTypes.has(typeInput) ? (typeInput as BikeType) : null;

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!rider) {
    return { error: "No rider profile found for your account yet.", success: null };
  }

  let photoUrl: string | null = null;
  let photoCaption: string | null = null;

  if (bikePhoto instanceof File && bikePhoto.size > 0) {
    if (!allowedImageTypes.has(bikePhoto.type)) {
      return { error: "Bike photo must be a JPG, PNG, or WebP image.", success: null };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet.", success: null };
    }

    let secureUpload: { buffer: Buffer };
    try {
      secureUpload = await validateAndScanImageUpload(bikePhoto, "garage-bike-photo-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate bike photo upload.", success: null };
    }

    const optimized = await optimizeImage(secureUpload.buffer);
    const key = `garage/${rider.id}/${crypto.randomUUID()}.${optimized.ext}`;
    photoUrl = await uploadFile(key, optimized.data, optimized.contentType);
    photoCaption = `${name} photo`;
  }

  const bike = await prisma.bike.create({
    data: {
      riderId: rider.id,
      name,
      make,
      model: model || null,
      year,
      type,
      engineType: engineType || null,
      displacement: displacement || null,
      photos: photoUrl
        ? {
            create: {
              url: photoUrl,
              caption: photoCaption,
            },
          }
        : undefined,
    },
    select: { id: true },
  });

  await logActivity(rider.id, "ADDED_BIKE", `Added bike ${name}`, bike.id);

  return { error: null, success: "Bike added to your garage." };
}

export async function updateBikeAction(bikeId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const bike = await prisma.bike.findFirst({
    where: {
      id: bikeId,
      rider: { userId },
    },
    include: {
      photos: true,
    },
  });

  if (!bike) {
    redirect("/garage/mine");
  }

  const name = normalizeText(formData.get("name"));
  const make = normalizeText(formData.get("make"));
  const model = normalizeText(formData.get("model"));
  const yearInput = normalizeText(formData.get("year"));
  const typeInput = normalizeText(formData.get("type"));
  const engineType = normalizeText(formData.get("engineType"));
  const displacement = normalizeText(formData.get("displacement"));
  const bikePhoto = formData.get("bikePhoto");
  const removePhoto = formData.get("removePhoto") === "on";

  if (!name || !make) {
    redirect("/garage/mine");
  }

  const year = toOptionalInt(yearInput);
  const type = typeInput && allowedBikeTypes.has(typeInput) ? (typeInput as BikeType) : null;
  const previousPhotoUrls = bike.photos.map((photo) => photo.url);
  let nextPhotoUrl: string | null = null;

  if (bikePhoto instanceof File && bikePhoto.size > 0) {
    if (allowedImageTypes.has(bikePhoto.type) && isS3Configured()) {
      try {
        const secureUpload = await validateAndScanImageUpload(bikePhoto, "garage-bike-photo-update");
        const optimized = await optimizeImage(secureUpload.buffer);
        const key = `garage/${bike.riderId}/${crypto.randomUUID()}.${optimized.ext}`;
        nextPhotoUrl = await uploadFile(key, optimized.data, optimized.contentType);
      } catch {
        nextPhotoUrl = null;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bike.update({
      where: { id: bike.id },
      data: {
        name,
        make,
        model: model || null,
        year,
        type,
        engineType: engineType || null,
        displacement: displacement || null,
      },
    });

    if (nextPhotoUrl || removePhoto) {
      await tx.galleryItem.deleteMany({ where: { bikeId: bike.id } });

      if (nextPhotoUrl) {
        await tx.galleryItem.create({
          data: {
            bikeId: bike.id,
            url: nextPhotoUrl,
            caption: `${name} photo`,
          },
        });
      }
    }
  });

  if (nextPhotoUrl || removePhoto) {
    await deleteFilesByUrls(previousPhotoUrls);
  }

  redirect("/garage/mine");
}

export async function setPrimaryBikeAction(bikeId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const bike = await prisma.bike.findFirst({ where: { id: bikeId, riderId: rider.id }, select: { id: true } });
  if (!bike) return;

  await prisma.rider.update({ where: { id: rider.id }, data: { primaryBikeId: bike.id } });
  revalidatePath("/garage/mine");
}

export async function deleteBikeAction(bikeId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const bike = await prisma.bike.findFirst({
    where: {
      id: bikeId,
      rider: { userId },
    },
    include: {
      photos: true,
    },
  });

  if (!bike) {
    redirect("/garage/mine");
  }

  const photoUrls = bike.photos.map((photo) => photo.url);
  await prisma.bike.delete({ where: { id: bike.id } });
  await deleteFilesByUrls(photoUrls);

  redirect("/garage/mine");
}

export async function createModificationAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const bikeId = normalizeText(formData.get("bikeId"));
  const title = normalizeText(formData.get("title"));
  const categoryInput = normalizeText(formData.get("category"));
  const costInput = normalizeText(formData.get("cost"));
  const mileageInput = normalizeText(formData.get("mileage"));
  const installedAtInput = normalizeText(formData.get("installedAt"));
  const notes = normalizeText(formData.get("notes"));

  if (!bikeId || !title) {
    redirect("/garage/mine");
  }

  const bike = await prisma.bike.findFirst({ where: { id: bikeId, riderId: rider.id }, select: { id: true } });
  if (!bike) {
    redirect("/garage/mine");
  }

  const category = categoryInput && allowedModificationCategories.has(categoryInput)
    ? (categoryInput as ModificationCategory)
    : "OTHER";
  const cost = costInput ? Number.parseFloat(costInput) : null;
  const mileage = toOptionalInt(mileageInput);
  const installedAt = installedAtInput ? new Date(installedAtInput) : new Date();

  const modification = await prisma.buildModification.create({
    data: {
      riderId: rider.id,
      bikeId,
      title,
      category,
      cost: Number.isFinite(cost ?? NaN) ? cost : null,
      mileage,
      installedAt: Number.isNaN(installedAt.getTime()) ? new Date() : installedAt,
      notes: notes || null,
    },
    select: { id: true },
  });

  await logActivity(rider.id, "ADDED_MODIFICATION", `Added modification ${title}`, modification.id);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${bikeId}`);
}

export async function deleteModificationAction(modificationId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const modification = await prisma.buildModification.findFirst({
    where: { id: modificationId, riderId: rider.id },
    include: { photos: true },
  });

  if (!modification) {
    return;
  }

  const photoUrls = modification.photos.map((photo) => photo.url);
  await prisma.buildModification.delete({ where: { id: modification.id } });
  await deleteFilesByUrls(photoUrls);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${modification.bikeId}`);
}

export async function updateModificationAction(modificationId: string, formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const modification = await prisma.buildModification.findFirst({ where: { id: modificationId, riderId: rider.id }, select: { id: true, bikeId: true } });
  if (!modification) return;

  const title = normalizeText(formData.get("title"));
  const categoryInput = normalizeText(formData.get("category"));
  const costInput = normalizeText(formData.get("cost"));
  const mileageInput = normalizeText(formData.get("mileage"));
  const installedAtInput = normalizeText(formData.get("installedAt"));
  const notes = normalizeText(formData.get("notes"));

  if (!title) return;

  const category = categoryInput && allowedModificationCategories.has(categoryInput)
    ? (categoryInput as ModificationCategory)
    : "OTHER";
  const cost = costInput ? Number.parseFloat(costInput) : null;
  const mileage = toOptionalInt(mileageInput);
  const installedAt = installedAtInput ? new Date(installedAtInput) : undefined;

  await prisma.buildModification.update({
    where: { id: modification.id },
    data: {
      title,
      category,
      cost: Number.isFinite(cost ?? NaN) ? cost : null,
      mileage,
      installedAt: installedAt && !Number.isNaN(installedAt.getTime()) ? installedAt : undefined,
      notes: notes || null,
    },
  });

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${modification.bikeId}`);
}

export async function createServiceRecordAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const bikeId = normalizeText(formData.get("bikeId"));
  const title = normalizeText(formData.get("title"));
  const serviceTypeInput = normalizeText(formData.get("serviceType"));
  const costInput = normalizeText(formData.get("cost"));
  const mileageInput = normalizeText(formData.get("mileage"));
  const servicedAtInput = normalizeText(formData.get("servicedAt"));
  const notes = normalizeText(formData.get("notes"));

  if (!bikeId || !title) {
    redirect("/garage/mine");
  }

  const bike = await prisma.bike.findFirst({ where: { id: bikeId, riderId: rider.id }, select: { id: true } });
  if (!bike) {
    redirect("/garage/mine");
  }

  const serviceType = serviceTypeInput && allowedServiceTypes.has(serviceTypeInput)
    ? (serviceTypeInput as ServiceType)
    : "MAINTENANCE";
  const cost = costInput ? Number.parseFloat(costInput) : null;
  const mileage = toOptionalInt(mileageInput);
  const servicedAt = servicedAtInput ? new Date(servicedAtInput) : new Date();

  const record = await prisma.serviceRecord.create({
    data: {
      riderId: rider.id,
      bikeId,
      title,
      serviceType,
      cost: Number.isFinite(cost ?? NaN) ? cost : null,
      mileage,
      servicedAt: Number.isNaN(servicedAt.getTime()) ? new Date() : servicedAt,
      notes: notes || null,
    },
    select: { id: true },
  });

  await logActivity(rider.id, "LOGGED_SERVICE", `Logged service ${title}`, record.id);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${bikeId}`);
}

export async function deleteServiceRecordAction(serviceRecordId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const record = await prisma.serviceRecord.findFirst({
    where: { id: serviceRecordId, riderId: rider.id },
    include: { photos: true },
  });

  if (!record) {
    return;
  }

  const photoUrls = record.photos.map((photo) => photo.url);
  await prisma.serviceRecord.delete({ where: { id: record.id } });
  await deleteFilesByUrls(photoUrls);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${record.bikeId}`);
}

export async function updateServiceRecordAction(serviceRecordId: string, formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const record = await prisma.serviceRecord.findFirst({ where: { id: serviceRecordId, riderId: rider.id }, select: { id: true, bikeId: true } });
  if (!record) return;

  const title = normalizeText(formData.get("title"));
  const serviceTypeInput = normalizeText(formData.get("serviceType"));
  const costInput = normalizeText(formData.get("cost"));
  const mileageInput = normalizeText(formData.get("mileage"));
  const servicedAtInput = normalizeText(formData.get("servicedAt"));
  const notes = normalizeText(formData.get("notes"));

  if (!title) return;

  const serviceType = serviceTypeInput && allowedServiceTypes.has(serviceTypeInput)
    ? (serviceTypeInput as ServiceType)
    : "MAINTENANCE";
  const cost = costInput ? Number.parseFloat(costInput) : null;
  const mileage = toOptionalInt(mileageInput);
  const servicedAt = servicedAtInput ? new Date(servicedAtInput) : undefined;

  await prisma.serviceRecord.update({
    where: { id: record.id },
    data: {
      title,
      serviceType,
      cost: Number.isFinite(cost ?? NaN) ? cost : null,
      mileage,
      servicedAt: servicedAt && !Number.isNaN(servicedAt.getTime()) ? servicedAt : undefined,
      notes: notes || null,
    },
  });

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${record.bikeId}`);
}

export async function addBikePhotoAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const bikeId = normalizeText(formData.get("bikeId"));
  const caption = normalizeText(formData.get("caption"));
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0 || !bikeId) {
    return;
  }

  if (!allowedImageTypes.has(photo.type) || !isS3Configured()) {
    return;
  }

  const bike = await prisma.bike.findFirst({ where: { id: bikeId, riderId: rider.id }, select: { id: true } });
  if (!bike) {
    return;
  }

  let secureUpload: { buffer: Buffer };
  try {
    secureUpload = await validateAndScanImageUpload(photo, "garage-bike-gallery-photo-create");
  } catch {
    return;
  }

  const optimized = await optimizeImage(secureUpload.buffer);
  const key = `garage/${rider.id}/${crypto.randomUUID()}.${optimized.ext}`;
  const url = await uploadFile(key, optimized.data, optimized.contentType);

  const item = await prisma.galleryItem.create({
    data: {
      bikeId,
      url,
      caption: caption || null,
    },
    select: { id: true },
  });

  await logActivity(rider.id, "UPLOADED_PHOTO", "Uploaded build photo", item.id);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${bikeId}`);
}

export async function deleteBikePhotoAction(photoId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const photo = await prisma.galleryItem.findFirst({
    where: { id: photoId, bike: { riderId: rider.id } },
    select: { id: true, url: true, bikeId: true },
  });

  if (!photo) {
    return;
  }

  await prisma.galleryItem.delete({ where: { id: photo.id } });
  await deleteFilesByUrls([photo.url]);

  revalidatePath("/garage/mine");
  revalidatePath(`/garage/mine/${photo.bikeId}`);
}

export async function createBuildCollectionAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const name = normalizeText(formData.get("name"));
  const description = normalizeText(formData.get("description"));
  const isPublic = formData.get("isPublic") === "on";

  if (!name) {
    return;
  }

  await prisma.buildCollection.create({
    data: {
      riderId: rider.id,
      name,
      description: description || null,
      isPublic,
    },
  });

  revalidatePath("/garage/mine");
}

export async function deleteBuildCollectionAction(collectionId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const collection = await prisma.buildCollection.findFirst({ where: { id: collectionId, riderId: rider.id }, select: { id: true } });
  if (!collection) {
    return;
  }

  await prisma.buildCollection.delete({ where: { id: collection.id } });
  revalidatePath("/garage/mine");
}

export async function addBuildToCollectionAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const collectionId = normalizeText(formData.get("collectionId"));
  const bikeId = normalizeText(formData.get("bikeId"));
  if (!collectionId || !bikeId) {
    return;
  }

  const collection = await prisma.buildCollection.findFirst({ where: { id: collectionId, riderId: rider.id }, select: { id: true } });
  if (!collection) {
    return;
  }

  await prisma.buildCollectionItem.upsert({
    where: { collectionId_bikeId: { collectionId, bikeId } },
    create: { collectionId, bikeId, addedByRiderId: rider.id },
    update: {},
  });

  revalidatePath("/garage/mine");
}

export async function removeBuildFromCollectionAction(collectionId: string, bikeId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const collection = await prisma.buildCollection.findFirst({ where: { id: collectionId, riderId: rider.id }, select: { id: true } });
  if (!collection) {
    return;
  }

  await prisma.buildCollectionItem.deleteMany({ where: { collectionId, bikeId } });
  revalidatePath("/garage/mine");
}

export async function toggleBuildFavoriteAction(bikeId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const existing = await prisma.buildFavorite.findUnique({ where: { riderId_bikeId: { riderId: rider.id, bikeId } }, select: { bikeId: true } });

  if (existing) {
    await prisma.buildFavorite.delete({ where: { riderId_bikeId: { riderId: rider.id, bikeId } } });
  } else {
    await prisma.buildFavorite.create({ data: { riderId: rider.id, bikeId } });
    await logActivity(rider.id, "FAVORITED_BUILD", "Favorited a build", bikeId);
  }

  revalidatePath("/garage/mine");
}

export async function toggleRiderFollowAction(targetHandle: string): Promise<void> {
  const rider = await requireCurrentRider();

  const target = await prisma.rider.findUnique({ where: { handle: targetHandle }, select: { id: true, name: true, handle: true } });
  if (!target || target.id === rider.id) {
    return;
  }

  const existing = await prisma.riderFollow.findUnique({
    where: { followerId_followingId: { followerId: rider.id, followingId: target.id } },
    select: { followerId: true },
  });

  if (existing) {
    await prisma.riderFollow.delete({ where: { followerId_followingId: { followerId: rider.id, followingId: target.id } } });
  } else {
    await prisma.riderFollow.create({ data: { followerId: rider.id, followingId: target.id } });
    await logActivity(rider.id, "FOLLOWED_RIDER", `Started following ${target.name}`, target.id);
  }

  revalidatePath(`/r/${target.handle}`);
}

export async function toggleEventFollowAction(eventId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const event = await prisma.rideEvent.findUnique({ where: { id: eventId }, select: { id: true, slug: true } });
  if (!event) {
    return;
  }

  const existing = await prisma.eventFollow.findUnique({ where: { riderId_eventId: { riderId: rider.id, eventId } }, select: { eventId: true } });

  if (existing) {
    await prisma.eventFollow.delete({ where: { riderId_eventId: { riderId: rider.id, eventId } } });
  } else {
    await prisma.eventFollow.create({ data: { riderId: rider.id, eventId } });
  }

  revalidatePath(`/events/${event.slug}`);
}
