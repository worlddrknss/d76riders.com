"use server";

import crypto from "node:crypto";

import { BikeType } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthenticationError, requireUserId } from "@/lib/authz";
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
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

    const ext = bikePhoto.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `garage/${rider.id}/${crypto.randomUUID()}.${ext}`;
    photoUrl = await uploadFile(key, Buffer.from(await bikePhoto.arrayBuffer()), bikePhoto.type);
    photoCaption = `${name} photo`;
  }

  await prisma.bike.create({
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
  });

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
      const ext = bikePhoto.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const key = `garage/${bike.riderId}/${crypto.randomUUID()}.${ext}`;
      nextPhotoUrl = await uploadFile(key, Buffer.from(await bikePhoto.arrayBuffer()), bikePhoto.type);
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
