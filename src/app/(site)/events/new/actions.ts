"use server";

import crypto from "node:crypto";

import { RideDifficulty } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { resolvePostableCrewId } from "@/lib/crews";
import { DEFAULT_TIMEZONE, isValidTimezone, zonedInputToUtc } from "@/lib/datetime";
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

function toOptionalCoord(value: string, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function toOptionalFloat(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
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

// Recurrence: shift a datetime-local wall-clock string (YYYY-MM-DDTHH:mm) by N
// steps, keeping the local time-of-day. We shift the wall clock (not the UTC
// instant) and re-derive UTC per occurrence, so a DST change between occurrences
// doesn't drift the ride's local start time.
function shiftWallClock(input: string, kind: string, steps: number): string {
  if (!input || steps === 0) return input;
  const [datePart, timePart] = input.split("T");
  const [y, m, d] = datePart.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (kind === "monthly") dt.setUTCMonth(dt.getUTCMonth() + steps);
  else dt.setUTCDate(dt.getUTCDate() + steps * (kind === "biweekly" ? 14 : 7));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}${timePart ? `T${timePart}` : ""}`;
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
  const excerpt = normalizeText(formData.get("excerpt"));
  const description = normalizeText(formData.get("description"));
  const facebookEventUrlInput = normalizeText(formData.get("facebookEventUrl"));
  const startsAtInput = normalizeText(formData.get("startsAt"));
  const meetLocation = normalizeText(formData.get("meetLocation"));
  const meetAddress = normalizeText(formData.get("meetAddress")).slice(0, 300);
  const meetLat = toOptionalCoord(normalizeText(formData.get("meetLat")), -90, 90);
  const meetLng = toOptionalCoord(normalizeText(formData.get("meetLng")), -180, 180);
  const endLocation = normalizeText(formData.get("endLocation"));
  const endAddress = normalizeText(formData.get("endAddress")).slice(0, 300);
  const endLat = toOptionalCoord(normalizeText(formData.get("endLat")), -90, 90);
  const endLng = toOptionalCoord(normalizeText(formData.get("endLng")), -180, 180);
  const ksuAtInput = normalizeText(formData.get("ksuAt"));
  const ksuLocation = normalizeText(formData.get("ksuLocation"));
  const ksuAddress = normalizeText(formData.get("ksuAddress")).slice(0, 300);
  const ksuLat = toOptionalCoord(normalizeText(formData.get("ksuLat")), -90, 90);
  const ksuLng = toOptionalCoord(normalizeText(formData.get("ksuLng")), -180, 180);
  const distanceMilesInput = normalizeText(formData.get("distanceMiles"));
  const maxCapacityInput = normalizeText(formData.get("maxCapacity"));
  const rsvpDeadlineInput = normalizeText(formData.get("rsvpDeadline"));
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

  // The wall-clock the organizer typed is in this zone; store true UTC.
  const timezoneInput = normalizeText(formData.get("timezone"));
  const timezone = isValidTimezone(timezoneInput) ? timezoneInput : DEFAULT_TIMEZONE;

  const startsAt = zonedInputToUtc(startsAtInput, timezone);

  if (!startsAt) {
    return { error: "A valid event start date and time is required." };
  }

  const ksuAt = zonedInputToUtc(ksuAtInput, timezone);
  if (ksuAtInput && !ksuAt) {
    return { error: "KSU date/time is invalid." };
  }

  const endsAtInput = normalizeText(formData.get("endsAt"));
  const endsAt = zonedInputToUtc(endsAtInput, timezone);
  if (endsAtInput && !endsAt) {
    return { error: "End date/time is invalid." };
  }
  if (endsAt && startsAt && endsAt.getTime() < startsAt.getTime()) {
    return { error: "End time must be after the start time." };
  }

  const galleryClosesAtInput = normalizeText(formData.get("galleryClosesAt"));
  const galleryClosesAt = zonedInputToUtc(galleryClosesAtInput, timezone);
  if (galleryClosesAtInput && !galleryClosesAt) {
    return { error: "Gallery close date/time is invalid." };
  }

  const distanceMiles = toOptionalInt(distanceMilesInput);
  if (distanceMilesInput && distanceMiles === null) {
    return { error: "Distance must be a whole number of miles." };
  }

  const maxCapacity = toOptionalInt(maxCapacityInput);
  if (maxCapacityInput && (maxCapacity === null || maxCapacity < 1)) {
    return { error: "Max capacity must be a positive whole number." };
  }

  const rsvpDeadline = zonedInputToUtc(rsvpDeadlineInput, timezone);
  if (rsvpDeadlineInput && !rsvpDeadline) {
    return { error: "RSVP deadline date/time is invalid." };
  }

  const facebookEventUrl = facebookEventUrlInput ? toOptionalUrl(facebookEventUrlInput) : null;
  if (facebookEventUrlInput && !facebookEventUrl) {
    return { error: "Facebook Event URL must be a valid URL." };
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

  // Optional sub-community — only honoured if the organizer belongs to it.
  const crewId = await resolvePostableCrewId(rider.id, normalizeText(formData.get("crewId")) || null);

  // Recurrence: create a series of occurrences that share a seriesId.
  const repeatKind = normalizeText(formData.get("repeat"));
  const isRecurring = repeatKind === "weekly" || repeatKind === "biweekly" || repeatKind === "monthly";
  const occurrenceCount = isRecurring
    ? Math.min(Math.max(toOptionalInt(normalizeText(formData.get("occurrences"))) ?? 4, 2), 12)
    : 1;
  const seriesId = occurrenceCount > 1 ? crypto.randomUUID() : null;

  // Pre-compute a unique slug per occurrence (checked against the DB and each
  // other, since the occurrences aren't committed yet).
  const slugs: string[] = [await buildUniqueEventSlug(title)];
  for (let i = 1; i < occurrenceCount; i++) {
    const base = `${slugs[0]}-${i + 1}`;
    let candidate = base;
    let suffix = 2;
    while (
      slugs.includes(candidate) ||
      (await prisma.rideEvent.findUnique({ where: { slug: candidate }, select: { id: true } }))
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    slugs.push(candidate);
  }

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
    const key = `events/${rider.id}/${slugs[0]}-${crypto.randomUUID()}.${optimized.ext}`;
    eventPhotoUrl = await uploadFile(key, optimized.data, optimized.contentType);
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < occurrenceCount; i++) {
      // Per-occurrence times: shift the wall clock and re-derive UTC (DST-safe).
      // i === 0 keeps the organizer's exact input.
      const occStartsAt = zonedInputToUtc(shiftWallClock(startsAtInput, repeatKind, i), timezone) ?? startsAt;
      const occKsuAt = zonedInputToUtc(shiftWallClock(ksuAtInput, repeatKind, i), timezone);
      const occEndsAt = zonedInputToUtc(shiftWallClock(endsAtInput, repeatKind, i), timezone);
      const occGalleryClosesAt = zonedInputToUtc(shiftWallClock(galleryClosesAtInput, repeatKind, i), timezone);
      const occRsvpDeadline = zonedInputToUtc(shiftWallClock(rsvpDeadlineInput, repeatKind, i), timezone);

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

      const event = await tx.rideEvent.create({
        data: {
          hostId: rider.id,
          crewId,
          seriesId,
          title,
          slug: slugs[i],
          excerpt: excerpt ? excerpt.slice(0, 255) : null,
          description: description || null,
          facebookEventUrl,
          startsAt: occStartsAt,
          endsAt: occEndsAt,
          galleryClosesAt: occGalleryClosesAt,
          ksuAt: occKsuAt,
          timezone,
          ksuLocation: ksuLocation || null,
          ksuAddress: ksuAddress || null,
          ksuLat,
          ksuLng,
          meetLocation: meetLocation || null,
          meetAddress: meetAddress || null,
          meetLat,
          meetLng,
          endLocation: endLocation || null,
          endAddress: endAddress || null,
          endLat,
          endLng,
          distanceMiles: resolvedRouteDistanceMiles ? Math.round(resolvedRouteDistanceMiles) : distanceMiles,
          maxCapacity,
          rsvpDeadline: occRsvpDeadline,
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

      await tx.eventOrganizer.create({
        data: {
          eventId: event.id,
          riderId: rider.id,
          role: "HOST",
        },
      });
    }
  });

  redirect(`/events/${slugs[0]}`);
}
