"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { distanceMilesFromGeometry } from "@/lib/routing";
import { getCurrentUser } from "@/lib/session";
import { isS3Configured, uploadFile } from "@/lib/s3";

export type CreateEventFormState = {
  error: string | null;
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

function toOptionalFloat(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type PlannerWaypointInput = {
  lng: number;
  lat: number;
  kind: "START" | "KSU" | "FUEL" | "FOOD" | "REST" | "STOP" | "END";
  label?: string;
};

function parseJsonValue<T>(value: string): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toOptionalDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function buildUniqueEventSlug(baseTitle: string): Promise<string> {
  const baseSlug = toSlug(baseTitle) || `event-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.rideEvent.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createEventAction(
  _previousState: CreateEventFormState,
  formData: FormData,
): Promise<CreateEventFormState> {
  const user = await getCurrentUser();
  let verifiedUserId: string;

  try {
    verifiedUserId = await requireUserRole(user?.id, "USER");
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in to create an event." };
    }

    if (error instanceof AuthorizationError) {
      return { error: "Your account does not have permission to create events." };
    }

    return { error: "Unable to verify your account permissions right now." };
  }

  const title = normalizeText(formData.get("title"));
  const description = normalizeText(formData.get("description"));
  const startsAtInput = normalizeText(formData.get("startsAt"));
  const meetLocation = normalizeText(formData.get("meetLocation"));
  const ksuAtInput = normalizeText(formData.get("ksuAt"));
  const ksuLocation = normalizeText(formData.get("ksuLocation"));
  const distanceMilesInput = normalizeText(formData.get("distanceMiles"));
  const difficultyInput = normalizeText(formData.get("difficulty"));

  const routeName = normalizeText(formData.get("routeName"));
  const routeDescription = normalizeText(formData.get("routeDescription"));
  const routeDistanceInput = normalizeText(formData.get("routeDistanceMiles"));
  const routeGeometryJson = normalizeText(formData.get("routeGeometryJson"));
  const routeWaypointsJson = normalizeText(formData.get("routeWaypointsJson"));
  const eventPhoto = formData.get("eventPhoto");

  if (!title) {
    return { error: "Event title is required." };
  }

  const startsAt = toOptionalDate(startsAtInput);

  if (!startsAt) {
    return { error: "A valid event start date and time is required." };
  }

  const ksuAt = toOptionalDate(ksuAtInput);
  if (ksuAtInput && !ksuAt) {
    return { error: "KSU date/time is invalid." };
  }

  const distanceMiles = toOptionalInt(distanceMilesInput);
  if (distanceMilesInput && distanceMiles === null) {
    return { error: "Distance must be a whole number of miles." };
  }

  const allowedDifficulties = new Set<string>(Object.values(RideDifficulty));
  const difficulty = difficultyInput && allowedDifficulties.has(difficultyInput)
    ? (difficultyInput as RideDifficulty)
    : null;

  if (difficultyInput && !difficulty) {
    return { error: "Selected difficulty is invalid." };
  }

  const routeDistanceMiles = toOptionalFloat(routeDistanceInput);
  if (routeDistanceInput && routeDistanceMiles === null) {
    return { error: "Route distance must be a valid number." };
  }

  const routeGeometry = parseJsonValue<{ type: "LineString"; coordinates: [number, number][] }>(
    routeGeometryJson,
  );

  if (routeGeometryJson && (!routeGeometry || routeGeometry.type !== "LineString")) {
    return { error: "Route geometry is invalid. Please redraw and try again." };
  }

  const routeWaypoints = parseJsonValue<PlannerWaypointInput[]>(routeWaypointsJson) ?? [];
  if (routeWaypointsJson && routeWaypoints.length === 0) {
    return { error: "Route waypoints are invalid. Please redraw and try again." };
  }

  const routeKsuWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "KSU");
  const routeStartWaypoint = routeWaypoints.find((waypoint) => waypoint.kind === "START");
  const routeKsuLat = routeKsuWaypoint?.lat ?? routeStartWaypoint?.lat ?? null;
  const routeKsuLng = routeKsuWaypoint?.lng ?? routeStartWaypoint?.lng ?? null;
  const derivedRouteDistanceMiles = routeGeometry?.coordinates.length
    ? distanceMilesFromGeometry(routeGeometry.coordinates)
    : null;
  const resolvedRouteDistanceMiles = derivedRouteDistanceMiles ?? routeDistanceMiles;

  const hasPlannerRoute = Boolean(routeGeometry && routeGeometry.coordinates.length >= 2);
  const hasRouteData = hasPlannerRoute || Boolean(routeName);

  const rider = await prisma.rider.findUnique({
    where: { userId: verifiedUserId },
    select: { id: true },
  });

  if (!rider) {
    return { error: "No rider profile found for your account yet." };
  }

  const slug = await buildUniqueEventSlug(title);
  let eventPhotoUrl: string | null = null;

  if (eventPhoto instanceof File && eventPhoto.size > 0) {
    if (!allowedImageTypes.has(eventPhoto.type)) {
      return { error: "Event photo must be a JPG, PNG, or WebP image." };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for image uploads yet." };
    }

    let secureUpload: { buffer: Buffer };
    try {
      secureUpload = await validateAndScanImageUpload(eventPhoto, "events-photo-create");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate event photo upload." };
    }

    const optimized = await optimizeImage(secureUpload.buffer);
    const key = `events/${rider.id}/${slug}-${crypto.randomUUID()}.${optimized.ext}`;
    eventPhotoUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  await prisma.$transaction(async (tx) => {
    let routeId: string | undefined;

    if (hasRouteData) {
      const resolvedRouteName = routeName || `${title} Route`;

      const route = await tx.route.create({
        data: {
          riderId: rider.id,
          name: resolvedRouteName,
          description: routeDescription || null,
          distanceMiles: resolvedRouteDistanceMiles,
          geometry: routeGeometry ?? undefined,
          ksuLat: routeKsuLat,
          ksuLng: routeKsuLng,
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

    await tx.rideEvent.create({
      data: {
        hostId: rider.id,
        title,
        slug,
        description: description || null,
        startsAt,
        ksuAt,
        ksuLocation: ksuLocation || null,
        meetLocation: meetLocation || null,
        distanceMiles: resolvedRouteDistanceMiles ? Math.round(resolvedRouteDistanceMiles) : distanceMiles,
        difficulty,
        routeId,
        galleryItems: eventPhotoUrl
          ? {
              create: {
                url: eventPhotoUrl,
                caption: `${title} cover image`,
              },
            }
          : undefined,
      },
    });
  });

  redirect(`/events/${slug}`);
}
