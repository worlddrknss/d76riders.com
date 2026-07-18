"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { distanceMilesFromGeometry } from "@/lib/routing";
import { routeGeometrySchema, routeWaypointsSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFileByUrl, deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

export type RoadFormState = {
  error: string | null;
  success: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}


function toOptionalFloat(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Scenic rating is a 0–5 scale; reject anything outside it rather than trust input.
function toOptionalRating(value: string): number | null {
  const parsed = toOptionalFloat(value);
  if (parsed === null) return null;
  return parsed >= 0 && parsed <= 5 ? parsed : null;
}

const allowedRoadDifficulties = new Set<string>(Object.values(RideDifficulty));

function toOptionalDifficulty(value: string): RideDifficulty | null {
  return value && allowedRoadDifficulties.has(value) ? (value as RideDifficulty) : null;
}

function toSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

async function buildUniqueRoadSlug(baseName: string): Promise<string> {
  const baseSlug = toSlug(baseName) || `road-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.road.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function parseJsonValue(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function createRoadAction(_previousState: RoadFormState, formData: FormData): Promise<RoadFormState> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const name = normalizeText(formData.get("name"));
  const description = normalizeText(formData.get("description"));
  const difficultyInput = normalizeText(formData.get("difficulty"));
  const scenicRating = toOptionalRating(normalizeText(formData.get("scenicRating")));
  const routeName = normalizeText(formData.get("routeName"));
  const routeDescription = normalizeText(formData.get("routeDescription"));
  const routeDistanceMiles = toOptionalFloat(normalizeText(formData.get("routeDistanceMiles")));
  const routeGeometryResult = routeGeometrySchema.safeParse(parseJsonValue(normalizeText(formData.get("routeGeometryJson"))));
  const routeGeometry = routeGeometryResult.success ? routeGeometryResult.data : null;
  const routeWaypointsResult = routeWaypointsSchema.safeParse(parseJsonValue(normalizeText(formData.get("routeWaypointsJson"))) ?? []);
  const routeWaypoints = routeWaypointsResult.success ? routeWaypointsResult.data : [];
  const coverImage = formData.get("coverImage");

  if (!name) {
    return { error: "Road name is required.", success: null };
  }

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) {
    return { error: "No rider profile found for your account yet.", success: null };
  }

  const slug = await buildUniqueRoadSlug(name);
  const difficulty = toOptionalDifficulty(difficultyInput);
  const routeKsuWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "KSU");
  const routeStartWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "START");
  const ksuLat = routeKsuWaypoint?.lat ?? routeStartWaypoint?.lat ?? null;
  const ksuLng = routeKsuWaypoint?.lng ?? routeStartWaypoint?.lng ?? null;
  const derivedRouteDistanceMiles = routeGeometry?.coordinates.length
    ? distanceMilesFromGeometry(routeGeometry.coordinates)
    : null;
  const resolvedDistanceMiles = derivedRouteDistanceMiles ?? routeDistanceMiles;

  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!allowedImageTypes.has(coverImage.type)) {
      return { error: "Road image must be a JPG, PNG, or WebP image.", success: null };
    }
    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet.", success: null };
    }
    let secureUpload: { buffer: Buffer };
    try {
      secureUpload = await validateAndScanImageUpload(coverImage, "roads-cover-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate road image upload.", success: null };
    }

    const optimized = await optimizeImage(secureUpload.buffer);
    const key = `roads/${rider.id}/${slug}-${crypto.randomUUID()}.${optimized.ext}`;
    coverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  await prisma.$transaction(async (tx) => {
    let routeId: string | undefined;
    if (routeGeometry?.coordinates.length) {
      const route = await tx.route.create({
        data: {
          riderId: rider.id,
          name: routeName || `${name} Route`,
          description: routeDescription || null,
          distanceMiles: resolvedDistanceMiles,
          geometry: routeGeometry,
          ksuLat,
          ksuLng,
          waypoints: routeWaypoints.length
            ? {
                create: routeWaypoints.map((waypoint, index) => ({
                  label: waypoint.label || null,
                  type: waypoint.kind,
                  lat: waypoint.lat,
                  lng: waypoint.lng,
                  order: index,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });
      routeId = route.id;
    }

    await tx.road.create({
      data: {
        riderId: rider.id,
        routeId,
        name,
        slug,
        distanceMiles: resolvedDistanceMiles ? Math.round(resolvedDistanceMiles) : null,
        difficulty,
        scenicRating,
        description: description || null,
        imageLabel: coverImageUrl ? `${name} cover image` : null,
        galleryItems: coverImageUrl
          ? {
              create: {
                url: coverImageUrl,
                caption: `${name} cover image`,
              },
            }
          : undefined,
      },
    });
  });

  redirect(`/roads/${slug}`);
}

export async function deleteRoadAction(roadId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const road = await prisma.road.findFirst({
    where: { id: roadId, rider: { userId } },
    include: { galleryItems: true },
  });

  if (!road) {
    redirect("/roads");
  }

  const urls = road.galleryItems.map((item) => item.url);
  await prisma.$transaction(async (tx) => {
    await tx.road.delete({ where: { id: road.id } });
    if (road.routeId) {
      await tx.route.delete({ where: { id: road.routeId } });
    }
  });
  await Promise.all(urls.map((url) => deleteFileByUrl(url)));
  redirect("/roads");
}

export async function updateRoadAction(roadId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const road = await prisma.road.findFirst({
    where: { id: roadId, rider: { userId } },
    include: {
      galleryItems: true,
      route: { include: { waypoints: true } },
      rider: { select: { id: true } },
    },
  });

  if (!road) {
    redirect("/roads");
  }

  const name = normalizeText(formData.get("name"));
  const description = normalizeText(formData.get("description"));
  const difficultyInput = normalizeText(formData.get("difficulty"));
  const scenicRating = toOptionalRating(normalizeText(formData.get("scenicRating")));
  const routeName = normalizeText(formData.get("routeName"));
  const routeDescription = normalizeText(formData.get("routeDescription"));
  const routeDistanceMiles = toOptionalFloat(normalizeText(formData.get("routeDistanceMiles")));
  const routeGeometryResult = routeGeometrySchema.safeParse(parseJsonValue(normalizeText(formData.get("routeGeometryJson"))));
  const routeGeometry = routeGeometryResult.success ? routeGeometryResult.data : null;
  const routeWaypointsResult = routeWaypointsSchema.safeParse(parseJsonValue(normalizeText(formData.get("routeWaypointsJson"))) ?? []);
  const routeWaypoints = routeWaypointsResult.success ? routeWaypointsResult.data : [];
  const coverImage = formData.get("coverImage");
  const removeCoverImage = formData.get("removeCoverImage") === "on";
  const removeRoute = formData.get("removeRoute") === "on";

  if (!name) {
    redirect(`/roads/${road.slug}`);
  }

  const difficulty = toOptionalDifficulty(difficultyInput);
  const routeKsuWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "KSU");
  const routeStartWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "START");
  const ksuLat = routeKsuWaypoint?.lat ?? routeStartWaypoint?.lat ?? null;
  const ksuLng = routeKsuWaypoint?.lng ?? routeStartWaypoint?.lng ?? null;
  const derivedRouteDistanceMiles = routeGeometry?.coordinates.length
    ? distanceMilesFromGeometry(routeGeometry.coordinates)
    : null;
  const resolvedDistanceMiles = derivedRouteDistanceMiles ?? routeDistanceMiles;
  const previousImageUrls = road.galleryItems.map((item) => item.url);
  let nextCoverImageUrl: string | null = road.galleryItems[0]?.url ?? null;

  if (coverImage instanceof File && coverImage.size > 0) {
    if (allowedImageTypes.has(coverImage.type) && isS3Configured()) {
      try {
        const secureUpload = await validateAndScanImageUpload(coverImage, "roads-cover-update");
        const optimized = await optimizeImage(secureUpload.buffer);
        const key = `roads/${road.rider.id}/${road.slug}-${crypto.randomUUID()}.${optimized.ext}`;
        nextCoverImageUrl = await uploadFile(key, optimized.data, optimized.contentType);
      } catch {
        nextCoverImageUrl = road.galleryItems[0]?.url ?? null;
      }
    }
  }

  if (removeCoverImage && !(coverImage instanceof File && coverImage.size > 0)) {
    nextCoverImageUrl = null;
  }

  await prisma.$transaction(async (tx) => {
    let routeId = road.routeId ?? null;

    if (removeRoute && road.routeId) {
      await tx.route.delete({ where: { id: road.routeId } });
      routeId = null;
    }

    if (routeGeometry?.coordinates.length) {
      if (road.routeId) {
        await tx.waypoint.deleteMany({ where: { routeId: road.routeId } });
        await tx.route.update({
          where: { id: road.routeId },
          data: {
            name: routeName || `${name} Route`,
            description: routeDescription || null,
            distanceMiles: resolvedDistanceMiles,
            geometry: routeGeometry,
            ksuLat,
            ksuLng,
            waypoints: routeWaypoints.length
              ? {
                  create: routeWaypoints.map((waypoint, index) => ({
                    label: waypoint.label || null,
                    type: waypoint.kind,
                    lat: waypoint.lat,
                    lng: waypoint.lng,
                    order: index,
                  })),
                }
              : undefined,
          },
        });
      } else {
        const route = await tx.route.create({
          data: {
            riderId: road.rider.id,
            name: routeName || `${name} Route`,
            description: routeDescription || null,
            distanceMiles: resolvedDistanceMiles,
            geometry: routeGeometry,
            ksuLat,
            ksuLng,
            waypoints: routeWaypoints.length
              ? {
                  create: routeWaypoints.map((waypoint, index) => ({
                    label: waypoint.label || null,
                    type: waypoint.kind,
                    lat: waypoint.lat,
                    lng: waypoint.lng,
                    order: index,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        });
        routeId = route.id;
      }
    }

    await tx.road.update({
      where: { id: road.id },
      data: {
        name,
        description: description || null,
        difficulty,
        scenicRating,
        distanceMiles: resolvedDistanceMiles ? Math.round(resolvedDistanceMiles) : road.distanceMiles,
        routeId,
      },
    });

    if (nextCoverImageUrl !== (road.galleryItems[0]?.url ?? null)) {
      await tx.galleryItem.deleteMany({ where: { roadId: road.id } });
      if (nextCoverImageUrl) {
        await tx.galleryItem.create({
          data: {
            roadId: road.id,
            url: nextCoverImageUrl,
            caption: `${name} cover image`,
          },
        });
      }
    }
  });

  if (nextCoverImageUrl !== (road.galleryItems[0]?.url ?? null)) {
    await deleteFilesByUrls(previousImageUrls);
  }

  redirect(`/roads/${road.slug}`);
}

// ─── Community Rating ────────────────────────────────────────────────────────

export type RateRoadState = {
  error: string | null;
  averageRating: number | null;
  totalRatings: number;
  userRating: number | null;
};

export async function rateRoadAction(roadId: string, score: number): Promise<RateRoadState> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { error: "Rating must be between 1 and 5.", averageRating: null, totalRatings: 0, userRating: null };
  }

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) {
    return { error: "You need a rider profile to rate roads.", averageRating: null, totalRatings: 0, userRating: null };
  }

  await prisma.roadRating.upsert({
    where: { roadId_riderId: { roadId, riderId: rider.id } },
    create: { roadId, riderId: rider.id, score },
    update: { score },
  });

  // Recompute average and update the cached field on Road
  const aggregate = await prisma.roadRating.aggregate({
    where: { roadId },
    _avg: { score: true },
    _count: { score: true },
  });

  const averageRating = aggregate._avg.score ?? null;
  const totalRatings = aggregate._count.score;

  await prisma.road.update({
    where: { id: roadId },
    data: { scenicRating: averageRating },
  });

  return { error: null, averageRating, totalRatings, userRating: score };
}
