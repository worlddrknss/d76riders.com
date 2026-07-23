"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { computeElevationGainFt } from "@/lib/elevation";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { distanceMilesFromGeometry } from "@/lib/routing";
import { routeGeometrySchema, routeWaypointsSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

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
  const elevationGainFt = routeGeometry?.coordinates.length
    ? await computeElevationGainFt(routeGeometry.coordinates as [number, number][])
    : null;

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
          elevationGainFt,
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

/**
 * Attach or replace a road's route from the planner.
 *
 * Mirrors saveEventRouteAction: the single entry point for road route geometry,
 * so a road created without one can get it later and an existing route is
 * replaced by drawing a new one. Open to any signed-in rider. Distance is
 * derived from the
 * geometry server-side rather than trusted from the client.
 */
export async function saveRoadRouteAction(
  roadId: string,
  payload: { geometry: string; waypoints: string; distanceMiles: string },
): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  requireUserId(currentUser?.id);

  // Roads are community-maintained: any signed-in rider can draw or replace a
  // route to keep it current. Deleting the road is the only owner/admin action.
  const road = await prisma.road.findUnique({
    where: { id: roadId },
    select: { id: true, slug: true, name: true, riderId: true, routeId: true },
  });
  if (!road) return { error: "Road not found." };

  const geometryResult = routeGeometrySchema.safeParse(parseJsonValue(payload.geometry));
  const geometry = geometryResult.success ? geometryResult.data : null;
  if (!geometry || geometry.coordinates.length < 2) {
    return { error: "Draw a route with at least two points before saving." };
  }
  const waypointsResult = routeWaypointsSchema.safeParse(parseJsonValue(payload.waypoints) ?? []);
  const waypoints = waypointsResult.success ? waypointsResult.data : [];

  const derivedMiles = distanceMilesFromGeometry(geometry.coordinates as [number, number][]);
  const distanceMiles = derivedMiles ?? toOptionalFloat(payload.distanceMiles);
  const ksu = waypoints.find((w) => w.kind === "KSU");
  const start = waypoints.find((w) => w.kind === "START");
  const elevationGainFt = await computeElevationGainFt(geometry.coordinates as [number, number][]);
  const previousRouteId = road.routeId;

  await prisma.$transaction(async (tx) => {
    const route = await tx.route.create({
      data: {
        riderId: road.riderId,
        name: `${road.name} Route`,
        distanceMiles,
        elevationGainFt,
        geometry,
        ksuLat: ksu?.lat ?? start?.lat ?? null,
        ksuLng: ksu?.lng ?? start?.lng ?? null,
        waypoints: waypoints.length
          ? {
              create: waypoints.map((w, index) => ({
                label: w.label || null,
                type: w.kind,
                lat: w.lat,
                lng: w.lng,
                order: index,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    await tx.road.update({
      where: { id: road.id },
      data: {
        routeId: route.id,
        distanceMiles: distanceMiles ? Math.round(distanceMiles) : undefined,
      },
    });

    // Replace, don't orphan: the old route's waypoints cascade with it.
    if (previousRouteId) {
      await tx.route.delete({ where: { id: previousRouteId } });
    }
  });

  revalidatePath(`/roads/${road.slug}`);
  revalidatePath("/roads");
  return { error: null };
}

export async function deleteRoadAction(roadId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  // Deleting stays restricted to the creator or an admin. Everyone can maintain
  // a road; nobody random gets to remove it.
  const isAdmin = currentUser?.roles?.includes("ADMINISTRATOR") ?? false;
  const road = await prisma.road.findUnique({
    where: { id: roadId },
    include: { galleryItems: true, rider: { select: { userId: true } } },
  });

  if (!road || !(isAdmin || road.rider.userId === userId)) {
    redirect("/roads");
  }

  const urls = road.galleryItems.map((item) => item.url);
  await prisma.$transaction(async (tx) => {
    await tx.road.delete({ where: { id: road.id } });
    if (road.routeId) {
      await tx.route.delete({ where: { id: road.routeId } });
    }
  });
  await deleteFilesByUrls(urls);
  redirect("/roads");
}

export async function updateRoadAction(roadId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  requireUserId(currentUser?.id);

  // Community-maintained: any signed-in rider can edit a road's details to keep
  // them accurate. The creator's attribution is unchanged.
  const road = await prisma.road.findUnique({
    where: { id: roadId },
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
  const elevationGainFt = routeGeometry?.coordinates.length
    ? await computeElevationGainFt(routeGeometry.coordinates as [number, number][])
    : null;
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
          elevationGainFt,
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
          elevationGainFt,
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

export type RoadFeedbackState = {
  error: string | null;
  count: number;
  averages: { scenery: number | null; condition: number | null; twistiness: number | null; quality: number | null };
  mine: { scenery: number; condition: number; twistiness: number } | null;
};

function clampScore(v: number): number | null {
  return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
}

/**
 * Post-ride Route Quality feedback — rate a road on three dimensions (scenery,
 * road condition, twistiness). Re-aggregates the cached averages + a blended
 * qualityScore on the Road. Returns fresh state to the client (no revalidate).
 */
export async function submitRoadFeedbackAction(
  roadId: string,
  scenery: number,
  condition: number,
  twistiness: number,
): Promise<RoadFeedbackState> {
  const empty: RoadFeedbackState = {
    error: "",
    count: 0,
    averages: { scenery: null, condition: null, twistiness: null, quality: null },
    mine: null,
  };

  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const s = clampScore(scenery);
  const c = clampScore(condition);
  const t = clampScore(twistiness);
  if (s == null || c == null || t == null) {
    return { ...empty, error: "Each rating must be 1 to 5." };
  }

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return { ...empty, error: "You need a rider profile to rate roads." };

  await prisma.roadRating.upsert({
    where: { roadId_riderId: { roadId, riderId: rider.id } },
    create: { roadId, riderId: rider.id, score: s, condition: c, twistiness: t },
    update: { score: s, condition: c, twistiness: t },
  });

  const agg = await prisma.roadRating.aggregate({
    where: { roadId },
    _avg: { score: true, condition: true, twistiness: true },
    _count: { _all: true },
  });

  const sceneryAvg = agg._avg.score ?? null;
  const conditionAvg = agg._avg.condition ?? null;
  const twistinessAvg = agg._avg.twistiness ?? null;
  const parts = [sceneryAvg, conditionAvg, twistinessAvg].filter((x): x is number => x != null);
  const quality = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;

  await prisma.road.update({
    where: { id: roadId },
    data: {
      scenicRating: sceneryAvg,
      conditionRating: conditionAvg,
      twistinessRating: twistinessAvg,
      qualityScore: quality,
    },
  });

  return {
    error: null,
    count: agg._count._all,
    averages: { scenery: sceneryAvg, condition: conditionAvg, twistiness: twistinessAvg, quality },
    mine: { scenery: s, condition: c, twistiness: t },
  };
}
