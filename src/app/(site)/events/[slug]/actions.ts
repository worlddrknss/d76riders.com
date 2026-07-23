"use server";

import crypto from "node:crypto";

import { Prisma, RideDifficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { absoluteUrl } from "@/lib/absolute-url";
import { logActivity, logActivityForRiders } from "@/lib/activity";
import { sendPushToRider } from "@/lib/push";
import { requireUserId } from "@/lib/authz";
import { resolvePostableCrewId } from "@/lib/crews";
import { DEFAULT_TIMEZONE, formatEventDate, formatEventTime, isValidTimezone, zonedInputToUtc } from "@/lib/datetime";
import { eventMessageEmail, rideChangeEmail, rsvpEmail } from "@/lib/email-templates";
import { emailNotifyRiders, pushNotifyRidersByCategory } from "@/lib/notify";
import { mapWithConcurrency } from "@/lib/concurrency";
import { syncRiderProgression } from "@/lib/reputation";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { distanceMilesFromGeometry } from "@/lib/routing";
import { eventMessageSchema, riderDownSchema, rsvpIntentSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

/**
 * Everyone who should hear about a change to this ride: riders holding a place
 * (going, waitlisted, interested) plus riders tracking it. Riders who declined
 * are left out — they weren't coming, so telling them is noise.
 *
 * Shared by cancel, reopen and delete so the three can't drift on who counts.
 */
async function rideAudienceRiderIds(eventId: string, excludeRiderId?: string | null): Promise<string[]> {
  const [rsvps, followers] = await Promise.all([
    prisma.rsvp.findMany({
      where: { eventId, status: { in: ["GOING", "WAITLISTED", "INTERESTED"] } },
      select: { riderId: true },
    }),
    prisma.eventFollow.findMany({ where: { eventId }, select: { riderId: true } }),
  ]);

  const ids = new Set([...rsvps, ...followers].map((row) => row.riderId));
  if (excludeRiderId) ids.delete(excludeRiderId);
  return [...ids];
}

// Organizer rider ids for an event (for fanning out notifications).
async function organizerRiderIds(eventId: string): Promise<string[]> {
  const organizers = await prisma.eventOrganizer.findMany({
    where: { eventId },
    select: { riderId: true },
  });
  return organizers.map((o) => o.riderId);
}

/**
 * Promote the earliest-waitlisted riders into any spots freed under maxCapacity.
 *
 * Returns the riders promoted, so the caller can email them *after* the
 * transaction commits — sending mail from inside one risks telling someone
 * they're in for a ride whose transaction then rolls back.
 */
async function promoteFromWaitlist(
  tx: Prisma.TransactionClient,
  eventId: string,
  eventTitle: string,
  maxCapacity: number,
): Promise<string[]> {
  const goingCount = await tx.rsvp.count({ where: { eventId, status: "GOING" } });
  const openSpots = maxCapacity - goingCount;
  if (openSpots <= 0) return [];

  const nextUp = await tx.rsvp.findMany({
    where: { eventId, status: "WAITLISTED" },
    orderBy: { createdAt: "asc" },
    take: openSpots,
    select: { id: true, riderId: true },
  });

  for (const rsvp of nextUp) {
    await tx.rsvp.update({ where: { id: rsvp.id }, data: { status: "GOING" } });
    await logActivity(
      {
        riderId: rsvp.riderId,
        type: "WAITLIST_PROMOTED",
        summary: `A spot opened up — you're confirmed for ${eventTitle}`,
        refId: eventId,
      },
      tx,
    );
  }

  return nextUp.map((rsvp) => rsvp.riderId);
}

async function requireOrganizerRider(userId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return null;
  return rider;
}

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function toOptionalCoord(value: string, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function toOptionalFloat(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const timezoneInput = normalizeText(formData.get("timezone"));
  const timezone = isValidTimezone(timezoneInput) ? timezoneInput : DEFAULT_TIMEZONE;
  const startsAt = zonedInputToUtc(normalizeText(formData.get("startsAt")), timezone);
  const endsAt = zonedInputToUtc(normalizeText(formData.get("endsAt")), timezone);
  const galleryClosesAt = zonedInputToUtc(normalizeText(formData.get("galleryClosesAt")), timezone);
  const ksuAt = zonedInputToUtc(normalizeText(formData.get("ksuAt")), timezone);
  const meetLocation = normalizeText(formData.get("meetLocation"));
  const meetAddress = normalizeText(formData.get("meetAddress")).slice(0, 300);
  const meetLat = toOptionalCoord(normalizeText(formData.get("meetLat")), -90, 90);
  const meetLng = toOptionalCoord(normalizeText(formData.get("meetLng")), -180, 180);
  const endLocation = normalizeText(formData.get("endLocation"));
  const endAddress = normalizeText(formData.get("endAddress")).slice(0, 300);
  const endLat = toOptionalCoord(normalizeText(formData.get("endLat")), -90, 90);
  const endLng = toOptionalCoord(normalizeText(formData.get("endLng")), -180, 180);
  const facebookEventUrlInput = normalizeText(formData.get("facebookEventUrl"));
  const distanceMiles = toOptionalInt(normalizeText(formData.get("distanceMiles")));
  const maxCapacity = toOptionalInt(normalizeText(formData.get("maxCapacity")));
  const rsvpDeadline = zonedInputToUtc(normalizeText(formData.get("rsvpDeadline")), timezone);
  const difficultyInput = normalizeText(formData.get("difficulty"));
  const removeRoute = formData.get("removeRoute") === "on";
  const eventPhoto = formData.get("eventPhoto");
  const removePhoto = formData.get("removePhoto") === "on";

  if (!title || !startsAt) {
    redirect(`/events/${event.slug}`);
  }

  // Sub-community: keep an existing assignment as-is (the editor may not be a
  // member of it), but any change must land in a sub-community they belong to.
  const crewIdInput = normalizeText(formData.get("crewId")) || null;
  let crewId: string | null;
  if (crewIdInput && crewIdInput === event.crewId) {
    crewId = event.crewId;
  } else {
    const editorRider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
    crewId = editorRider ? await resolvePostableCrewId(editorRider.id, crewIdInput) : null;
  }

  const facebookEventUrl = toOptionalUrl(facebookEventUrlInput);
  if (facebookEventUrlInput && !facebookEventUrl) {
    redirect(`/events/${event.slug}`);
  }

  const allowedDifficulties = new Set<string>(Object.values(RideDifficulty));
  const difficulty =
    difficultyInput && allowedDifficulties.has(difficultyInput)
      ? (difficultyInput as RideDifficulty)
      : null;
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
        crewId,
        excerpt: excerpt ? excerpt.slice(0, 255) : null,
        description: description || null,
        startsAt,
        endsAt,
        galleryClosesAt,
        ksuAt,
        timezone,
        meetLocation: meetLocation || null,
        meetAddress: meetAddress || null,
        meetLat,
        meetLng,
        endLocation: endLocation || null,
        endAddress: endAddress || null,
        endLat,
        endLng,
        facebookEventUrl,
        distanceMiles,
        maxCapacity,
        rsvpDeadline,
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

  // Tell the people who are counting on this ride when it actually moves.
  //
  // Only the details that change a rider's plans count: the start, kickstands
  // up, and where to meet. A tweaked description or a new cover photo isn't
  // worth a notification, and treating it as one is how people learn to ignore
  // them. Trackers and RSVP'd riders are told together — notifying trackers
  // about a time change while leaving attendees in the dark would be absurd.
  const timeChanged = event.startsAt.getTime() !== startsAt.getTime();
  const ksuChanged = (event.ksuAt?.getTime() ?? null) !== (ksuAt?.getTime() ?? null);
  const placeChanged = (event.meetLocation ?? "") !== (meetLocation || "");

  if (timeChanged || ksuChanged || placeChanged) {
    const [followers, rsvps, editor] = await Promise.all([
      prisma.eventFollow.findMany({ where: { eventId: event.id }, select: { riderId: true } }),
      prisma.rsvp.findMany({
        where: { eventId: event.id, status: { in: ["GOING", "WAITLISTED", "INTERESTED"] } },
        select: { riderId: true },
      }),
      prisma.rider.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    const audience = new Set([...followers, ...rsvps].map((r) => r.riderId));
    // The organizer making the change doesn't need telling.
    if (editor) audience.delete(editor.id);

    if (audience.size > 0) {
      const parts: string[] = [];
      if (timeChanged) parts.push(`now ${formatEventDate(startsAt, timezone)} at ${formatEventTime(startsAt, timezone)}`);
      if (ksuChanged) parts.push(ksuAt ? `kickstands up ${formatEventTime(ksuAt, timezone)}` : "kickstands-up time removed");
      if (placeChanged) parts.push(meetLocation ? `meeting at ${meetLocation}` : "meetup location removed");
      const summary = `${title} changed — ${parts.join(" · ")}`;

      const riderIds = [...audience];
      await logActivityForRiders(riderIds, {
        type: "EVENT_UPDATED",
        summary,
        refId: event.id,
      });
      await pushNotifyRidersByCategory(riderIds, "rideChange", {
          title: "Ride details changed",
          body: summary,
          url: `/events/${event.slug}`,
          tag: `event-updated-${event.id}`,
    });
      await emailNotifyRiders(riderIds, "rideChange", (name) =>
        rideChangeEmail(name, `Changed: ${title}`, summary, absoluteUrl(`/events/${event.slug}`)),
      );
    }
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/notifications");
}

type PlannerWaypointInput = {
  lng: number;
  lat: number;
  kind: "START" | "KSU" | "FUEL" | "FOOD" | "REST" | "STOP" | "END";
  label?: string;
};

function parseJson<T>(value: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Attach (or replace) an event's official route from the route planner. This is
 * the single entry point for event route planning — a ride created without a
 * route can get one later, and an existing route is replaced by drawing a new
 * one. Organizer-only.
 */
export async function saveEventRouteAction(
  eventId: string,
  payload: { geometry: string; waypoints: string; distanceMiles: string },
): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findFirst({
    where: { id: eventId, organizers: { some: { rider: { userId } } } },
    select: { id: true, slug: true, title: true, hostId: true, routeId: true },
  });
  if (!event) return { error: "Only this ride's organizers can set its route." };

  const geometry = parseJson<{ type: "LineString"; coordinates: [number, number][] }>(payload.geometry);
  if (!geometry || geometry.type !== "LineString" || geometry.coordinates.length < 2) {
    return { error: "Draw a route with at least two points before saving." };
  }
  const waypoints = parseJson<PlannerWaypointInput[]>(payload.waypoints) ?? [];

  // Trust the geometry over the client's number.
  const derivedMiles = distanceMilesFromGeometry(geometry.coordinates);
  const distanceMiles = derivedMiles ?? toOptionalFloat(payload.distanceMiles);
  const ksu = waypoints.find((w) => w.kind === "KSU");
  const start = waypoints.find((w) => w.kind === "START");
  const previousRouteId = event.routeId;

  await prisma.$transaction(async (tx) => {
    const route = await tx.route.create({
      data: {
        riderId: event.hostId,
        name: `${event.title} Route`,
        distanceMiles,
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

    await tx.rideEvent.update({
      where: { id: event.id },
      data: {
        routeId: route.id,
        distanceMiles: distanceMiles ? Math.round(distanceMiles) : undefined,
      },
    });

    // routeId is unique per event, so the old route is orphaned once swapped.
    if (previousRouteId) {
      await tx.route.delete({ where: { id: previousRouteId } });
    }
  });

  revalidatePath(`/events/${event.slug}`);
  return { error: null };
}

/**
 * Call a ride off without destroying it.
 *
 * Deleting was the only way to cancel, which also took the photos, the route,
 * the roster and every rider's record of having been there. A cancelled ride
 * keeps its page — riders who arrive at a stale link get an answer instead of a
 * 404 — and can be reopened if the weather call goes the other way.
 *
 * HOST-only, matching delete: a sweep or marshal shouldn't be able to call off
 * someone else's ride.
 */
export async function cancelEventAction(eventId: string): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findFirst({
    where: { id: eventId, organizers: { some: { rider: { userId }, role: "HOST" } } },
    select: { id: true, slug: true, title: true, status: true, startsAt: true, timezone: true },
  });
  if (!event) return { error: "Only this ride's host can cancel it." };
  if (event.status === "CANCELLED") return { error: null };
  if (event.status === "COMPLETED") return { error: "This ride has already been completed." };

  await prisma.rideEvent.update({ where: { id: event.id }, data: { status: "CANCELLED" } });

  const host = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  const riderIds = await rideAudienceRiderIds(event.id, host?.id);

  if (riderIds.length > 0) {
    const summary = `${event.title} on ${formatEventDate(event.startsAt, event.timezone)} was cancelled by the organizer.`;
    await logActivityForRiders(riderIds, { type: "EVENT_CANCELLED", summary, refId: event.id });
    await pushNotifyRidersByCategory(riderIds, "rideChange", {
        title: "Ride cancelled",
        body: summary,
        url: `/events/${event.slug}`,
        tag: `event-cancelled-${event.id}`,
    });
    // Push only reaches riders who granted it. A cancelled ride is the one thing
    // they must not find out about by turning up.
    await emailNotifyRiders(riderIds, "rideChange", (name) =>
      rideChangeEmail(name, `Cancelled: ${event.title}`, summary, absoluteUrl(`/events/${event.slug}`)),
    );
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/events");
  revalidatePath("/notifications");
  return { error: null };
}

/**
 * Put a cancelled ride back on. The same people who were told it was off are
 * told it's back — a cancellation nobody can see reversed is worse than not
 * being able to reverse it.
 */
export async function reopenEventAction(eventId: string): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findFirst({
    where: { id: eventId, organizers: { some: { rider: { userId }, role: "HOST" } } },
    select: { id: true, slug: true, title: true, status: true, startsAt: true, timezone: true },
  });
  if (!event) return { error: "Only this ride's host can reopen it." };
  if (event.status !== "CANCELLED") return { error: null };

  await prisma.rideEvent.update({ where: { id: event.id }, data: { status: "UPCOMING" } });

  const host = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  const riderIds = await rideAudienceRiderIds(event.id, host?.id);

  if (riderIds.length > 0) {
    const summary = `${event.title} is back on — ${formatEventDate(event.startsAt, event.timezone)} at ${formatEventTime(event.startsAt, event.timezone)}.`;
    await logActivityForRiders(riderIds, { type: "EVENT_UPDATED", summary, refId: event.id });
    await pushNotifyRidersByCategory(riderIds, "rideChange", {
        title: "Ride is back on",
        body: summary,
        url: `/events/${event.slug}`,
        tag: `event-reopened-${event.id}`,
    });
    await emailNotifyRiders(riderIds, "rideChange", (name) =>
      rideChangeEmail(name, `Back on: ${event.title}`, summary, absoluteUrl(`/events/${event.slug}`)),
    );
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/events");
  revalidatePath("/notifications");
  return { error: null };
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

  // Gathered before the transaction wipes the very rows that say who to tell.
  const host = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  const audience = new Set(await rideAudienceRiderIds(event.id, host?.id));

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

  // Only after the ride is genuinely gone — announcing a cancellation that then
  // failed to happen would be worse than saying nothing.
  //
  // The summary has to stand on its own: the event no longer exists, so there's
  // nothing to link to and no page that can fill in what "it" was. Activity.refId
  // is a loose reference with no foreign key, so the record survives the delete.
  if (audience.size > 0) {
    const when = formatEventDate(event.startsAt, event.timezone);
    const summary = `${event.title} on ${when} was cancelled by the organizer.`;
    const riderIds = [...audience];

    await logActivityForRiders(riderIds, {
      type: "EVENT_CANCELLED",
      summary,
      refId: event.id,
    });
    await pushNotifyRidersByCategory(riderIds, "rideChange", {
        title: "Ride cancelled",
        body: summary,
        url: "/events",
        tag: `event-cancelled-${event.id}`,
    });
    // No link to the ride — it no longer exists — so the email points at /events.
    await emailNotifyRiders(riderIds, "rideChange", (name) =>
      rideChangeEmail(name, `Cancelled: ${event.title}`, summary, absoluteUrl("/events")),
    );
  }

  await deleteFilesByUrls(urls);
  revalidatePath("/events");
  revalidatePath("/notifications");
}

export type RsvpResult = {
  error: string | null;
  status: "GOING" | "WAITLISTED" | "CANCELLED" | null;
};

export type EventMessageResult = { error: string | null; sent: number | null };

/**
 * Send a message from an organizer to the riders on an event.
 *
 * Delivered as an in-app activity, so it lands in the existing /notifications
 * inbox rather than needing a parallel message store — the same fan-out Close
 * Ride already uses.
 *
 * The sender is named in the summary because an unattributed message from
 * "the event" is worth less than one from a rider you know is leading it.
 */
export async function messageEventRidersAction(
  eventId: string,
  formData: FormData,
): Promise<EventMessageResult> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in.", sent: null };
  }

  const parsed = eventMessageSchema.safeParse({
    audience: formData.get("audience")?.toString(),
    body: formData.get("body")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message.", sent: null };
  }
  const { audience, body } = parsed.data;

  // Any organizer of this event may message its riders.
  const event = await prisma.rideEvent.findFirst({
    where: { id: eventId, organizers: { some: { rider: { userId } } } },
    select: { id: true, slug: true, title: true },
  });

  if (!event) {
    return { error: "Only this ride's organizers can message riders.", sent: null };
  }

  const sender = await prisma.rider.findUnique({ where: { userId }, select: { id: true, name: true } });
  if (!sender) {
    return { error: "Rider profile not found.", sent: null };
  }

  // CHECKED_IN reads from check-ins, TRACKING from follows; the rest are RSVP states.
  let riderIds: string[];
  if (audience === "TRACKING") {
    const follows = await prisma.eventFollow.findMany({ where: { eventId }, select: { riderId: true } });
    riderIds = follows.map((row) => row.riderId);
  } else if (audience === "CHECKED_IN") {
    const checkIns = await prisma.eventCheckIn.findMany({
      where: { eventId },
      select: { riderId: true },
    });
    riderIds = checkIns.map((row) => row.riderId);
  } else {
    const rsvps = await prisma.rsvp.findMany({
      where: {
        eventId,
        // ALL means everyone who signalled interest — not the riders who
        // explicitly said they're not coming.
        status: audience === "ALL" ? { in: ["GOING", "WAITLISTED", "INTERESTED"] } : audience,
      },
      select: { riderId: true },
    });
    riderIds = rsvps.map((row) => row.riderId);
  }

  // Don't notify the organizer about their own message.
  const recipients = riderIds.filter((riderId) => riderId !== sender.id);

  if (recipients.length === 0) {
    return { error: "No riders match that audience yet.", sent: null };
  }

  await logActivityForRiders(recipients, {
    type: "EVENT_MESSAGE",
    summary: `${sender.name} — ${event.title}: ${body}`,
    refId: event.id,
  });

  // Also email the audience, gated by each rider's emailOnEventMessage opt-out.
  await emailNotifyRiders(recipients, "event", (name) =>
    eventMessageEmail(name, sender.name, event.title, body, absoluteUrl(`/events/${event.slug}`)),
  );

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/notifications");

  return { error: null, sent: recipients.length };
}

export async function rsvpAction(
  eventId: string,
  intentInput: "GOING" | "CANCEL",
): Promise<RsvpResult> {
  const parsedIntent = rsvpIntentSchema.safeParse(intentInput);
  if (typeof eventId !== "string" || !eventId || !parsedIntent.success) {
    return { error: "Invalid request.", status: null };
  }
  const intent = parsedIntent.data;

  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in to RSVP.", status: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!rider) {
    return { error: "Rider profile not found.", status: null };
  }

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, title: true, status: true, maxCapacity: true, rsvpDeadline: true },
  });
  if (!event) {
    return { error: "Event not found.", status: null };
  }

  if (intent === "CANCEL") {
    const promoted = await prisma.$transaction(async (tx) => {
      const existing = await tx.rsvp.findUnique({
        where: { eventId_riderId: { eventId, riderId: rider.id } },
        select: { status: true },
      });
      await tx.rsvp.deleteMany({ where: { eventId, riderId: rider.id } });

      // Freeing a GOING spot promotes the earliest waitlisted rider.
      if (existing?.status === "GOING" && event.maxCapacity != null) {
        return promoteFromWaitlist(tx, event.id, event.title, event.maxCapacity);
      }
      return [];
    });

    // Coming off a waitlist means you're now expected to turn up, which is worth
    // more than an in-app badge the rider may not open before the ride.
    if (promoted.length > 0) {
      const detail = `A spot opened up — you're confirmed for ${event.title}.`;
      await pushNotifyRidersByCategory(promoted, "rideChange", {
          title: "You're in",
          body: detail,
          url: `/events/${event.slug}`,
          tag: `waitlist-promoted-${event.id}`,
    });
      await emailNotifyRiders(promoted, "rideChange", (name) =>
        rideChangeEmail(name, `You're in: ${event.title}`, detail, absoluteUrl(`/events/${event.slug}`)),
      );
    }

    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/events");
    return { error: null, status: "CANCELLED" };
  }

  // A cancelled or finished ride takes no new RSVPs. Withdrawing is handled
  // above and stays allowed, so nobody is stuck on a roster for a dead ride.
  if (event.status === "CANCELLED") {
    return { error: "This ride was cancelled.", status: null };
  }
  if (event.status === "COMPLETED") {
    return { error: "This ride has already happened.", status: null };
  }

  // RSVP cutoff.
  if (event.rsvpDeadline && event.rsvpDeadline.getTime() < Date.now()) {
    return { error: "RSVPs for this ride are closed.", status: null };
  }

  const result = await prisma.$transaction<RsvpResult>(async (tx) => {
    const existing = await tx.rsvp.findUnique({
      where: { eventId_riderId: { eventId, riderId: rider.id } },
      select: { status: true },
    });
    // Already holding a confirmed or waitlisted spot — nothing to change.
    if (existing?.status === "GOING") return { error: null, status: "GOING" };
    if (existing?.status === "WAITLISTED") return { error: null, status: "WAITLISTED" };

    let nextStatus: "GOING" | "WAITLISTED" = "GOING";
    if (event.maxCapacity != null) {
      const goingCount = await tx.rsvp.count({ where: { eventId, status: "GOING" } });
      if (goingCount >= event.maxCapacity) {
        nextStatus = "WAITLISTED";
      }
    }

    await tx.rsvp.upsert({
      where: { eventId_riderId: { eventId, riderId: rider.id } },
      create: { eventId, riderId: rider.id, status: nextStatus },
      update: { status: nextStatus },
    });

    if (nextStatus === "WAITLISTED") {
      await logActivity(
        {
          riderId: rider.id,
          type: "RSVP_WAITLISTED",
          summary: `You're on the waitlist for ${event.title}`,
          refId: event.id,
        },
        tx,
      );
    }

    return { error: null, status: nextStatus };
  });

  // A newly-confirmed rider (only reached on a fresh RSVP — existing GOING/
  // WAITLISTED returned early) pings the organizers in-app + by email.
  if (result.status === "GOING") {
    const organizerIds = (await organizerRiderIds(event.id)).filter((id) => id !== rider.id);
    if (organizerIds.length) {
      const me = await prisma.rider.findUnique({ where: { id: rider.id }, select: { name: true } });
      const riderName = me?.name ?? "A rider";
      await logActivityForRiders(organizerIds, {
        type: "RSVP",
        summary: `${riderName} is going to ${event.title}`,
        refId: event.id,
      });
      const url = absoluteUrl(`/events/${event.slug}`);
      await emailNotifyRiders(organizerIds, "rsvp", (name) =>
        rsvpEmail(name, riderName, event.title, url),
      );
    }
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/events");
  return result;
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

  const existing = await prisma.eventCheckIn.findUnique({
    where: { eventId_riderId: { eventId, riderId: rider.id } },
    select: { id: true },
  });
  if (existing) {
    revalidatePath("/events");
    return;
  }

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  await prisma.eventCheckIn.create({
    data: { eventId, riderId: rider.id, method: "QR" },
  });
  await logActivity({
    riderId: rider.id,
    type: "CHECK_IN",
    summary: `Checked in to ${event?.title ?? "a ride"}`,
    refId: eventId,
  });

  // Checking in can immediately earn a badge (first group ride, mileage), so
  // refresh progression rather than waiting for the ride to close.
  await syncRiderProgression(rider.id);

  revalidatePath("/events");
}

export async function checkOutAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await requireOrganizerRider(userId);
  if (!rider) return;

  const updated = await prisma.eventCheckIn.updateMany({
    where: { eventId, riderId: rider.id, checkOutAt: null },
    data: { checkOutAt: new Date() },
  });

  if (updated.count > 0) {
    const event = await prisma.rideEvent.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    await logActivity({
      riderId: rider.id,
      type: "CHECK_OUT",
      summary: `Checked out of ${event?.title ?? "a ride"}`,
      refId: eventId,
    });
  }

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

  const existing = await prisma.eventCheckIn.findUnique({
    where: { eventId_riderId: { eventId, riderId: targetRiderId } },
    select: { id: true },
  });
  if (existing) {
    revalidatePath("/events");
    return;
  }

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  await prisma.eventCheckIn.create({
    data: { eventId, riderId: targetRiderId, method: "MANUAL" },
  });
  await logActivity({
    riderId: targetRiderId,
    type: "CHECK_IN",
    summary: `Checked in to ${event?.title ?? "a ride"}`,
    refId: eventId,
  });

  await syncRiderProgression(targetRiderId);

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

  // Four independent reads — no reason to wait for each in turn. The checkout
  // ones must still be captured before the transaction auto-checks-everyone-out.
  const [event, missingCheckout, goingRsvps, checkIns] = await Promise.all([
    prisma.rideEvent.findUnique({
      where: { id: eventId },
      select: { title: true, slug: true, distanceMiles: true },
    }),
    // Riders still checked in without a checkout, BEFORE auto-checkout.
    prisma.eventCheckIn.findMany({
      where: { eventId, checkOutAt: null },
      select: { rider: { select: { id: true, name: true } } },
    }),
    // No-shows: riders who committed (GOING) but never checked in.
    prisma.rsvp.findMany({
      where: { eventId, status: "GOING" },
      select: { riderId: true, rider: { select: { name: true } } },
    }),
    prisma.eventCheckIn.findMany({ where: { eventId }, select: { riderId: true } }),
  ]);

  const eventTitle = event?.title ?? "a ride";
  const checkedInRiderIds = new Set(checkIns.map((c) => c.riderId));
  const noShows = goingRsvps.filter((r) => !checkedInRiderIds.has(r.riderId));

  await prisma.$transaction(async (tx) => {
    await tx.rideEvent.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
    });
    // Auto-checkout everyone who hasn't checked out.
    await tx.eventCheckIn.updateMany({
      where: { eventId, checkOutAt: null },
      data: { checkOutAt: new Date() },
    });

    // Alert organizers about riders who never checked out.
    if (missingCheckout.length > 0) {
      const organizers = await tx.eventOrganizer.findMany({
        where: { eventId },
        select: { riderId: true },
      });
      const names = missingCheckout.map((c) => c.rider.name).join(", ");
      await logActivityForRiders(
        organizers.map((o) => o.riderId),
        {
          type: "MISSING_CHECKOUT",
          summary: `${missingCheckout.length} rider${missingCheckout.length > 1 ? "s" : ""} never checked out of ${eventTitle}: ${names}`,
          refId: eventId,
        },
        tx,
      );
    }

    // Flag no-shows in each affected rider's feed.
    for (const ns of noShows) {
      await logActivity(
        {
          riderId: ns.riderId,
          type: "NO_SHOW",
          summary: `Marked as a no-show for ${eventTitle} (RSVP'd but never checked in)`,
          refId: eventId,
        },
        tx,
      );
    }
  });

  // Closing the ride is what finalises attendance, so recompute progression for
  // everyone it touched — attendees (who may have earned badges) and no-shows
  // (whose attendance rate just dropped). Done outside the transaction: a
  // reputation hiccup must not roll back the ride closing.
  const affectedRiderIds = [
    ...new Set([...checkedInRiderIds, ...noShows.map((ns) => ns.riderId)]),
  ];
  // Bounded, not sequential and not all at once: each recompute is several
  // queries, so a forty-rider ride was forty round trips end to end, and firing
  // them together would put forty of them on a pool sized for a handful.
  await mapWithConcurrency(affectedRiderIds, 4, (riderId) => syncRiderProgression(riderId));

  // Post-ride recap: pull everyone who actually rode back to see the photos.
  if (checkedInRiderIds.size > 0 && event) {
    const riderCount = checkedInRiderIds.size;
    const photoCount = await prisma.galleryItem.count({
      where: { eventId, riderId: { not: null } },
    });
    const parts = [
      `${riderCount} rider${riderCount === 1 ? "" : "s"} rode`,
      event.distanceMiles ? `${event.distanceMiles} mi` : null,
      photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    const recapBody = `${parts.join(" · ")}. See how it went.`;
    const recapRiderIds = [...checkedInRiderIds];

    await logActivityForRiders(recapRiderIds, {
      type: "COMPLETED_RIDE",
      summary: `Ride recap — ${eventTitle}: ${recapBody}`,
      refId: eventId,
    });
    await pushNotifyRidersByCategory(recapRiderIds, "reminder", {
        title: `Ride recap — ${eventTitle}`,
        body: recapBody,
        url: `/events/${event.slug}`,
        tag: `ride-recap-${eventId}`,
    });
    await emailNotifyRiders(recapRiderIds, "reminder", (name) =>
      rideChangeEmail(name, `Ride recap — ${eventTitle}`, recapBody, absoluteUrl(`/events/${event.slug}`)),
    );
  }

  revalidatePath("/events");
  revalidatePath("/leaderboard");
}

// ─── Organizer Management ───────────────────────────────────────────

export async function addOrganizerAction(
  eventId: string,
  targetHandle: string,
  role: "LEAD" | "SWEEP" | "MARSHAL",
): Promise<{ error: string | null }> {
  if (role !== "LEAD" && role !== "SWEEP" && role !== "MARSHAL") {
    return { error: "Invalid organizer role." };
  }
  if (typeof eventId !== "string" || !eventId || typeof targetHandle !== "string" || !targetHandle) {
    return { error: "Invalid request." };
  }

  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  // Only HOST can add organizers
  const hostOrg = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId }, role: "HOST" },
    select: { id: true },
  });
  if (!hostOrg) return { error: "Only the host can manage organizers." };

  // Handles are stored lowercase (enforced at signup), so match what someone
  // typed rather than rejecting "WorldDrknss" as an unknown rider.
  const targetRider = await prisma.rider.findUnique({
    where: { handle: targetHandle.trim().toLowerCase() },
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

/**
 * Hand the ride to someone else.
 *
 * Ownership lives in two places — `RideEvent.hostId` (what the page and every
 * permission check reads) and the mirrored HOST row in EventOrganizer (what the
 * staff list renders) — so both move together in one transaction or neither
 * does. The outgoing host stays on as a LEAD rather than being dropped: they
 * planned the ride, and silently revoking their access on handover would be a
 * surprise. They can be removed afterwards by the new host.
 */
export async function transferHostAction(
  eventId: string,
  targetHandle: string,
): Promise<{ error: string | null }> {
  if (typeof eventId !== "string" || !eventId || typeof targetHandle !== "string" || !targetHandle) {
    return { error: "Invalid request." };
  }

  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, title: true, hostId: true, host: { select: { userId: true, name: true } } },
  });
  if (!event) return { error: "Ride not found." };

  // hostId is the source of truth — a co-organizer with a LEAD row can't hand
  // away a ride that isn't theirs.
  if (event.host.userId !== userId) return { error: "Only the host can transfer the ride." };

  const target = await prisma.rider.findUnique({
    where: { handle: targetHandle.trim().toLowerCase() },
    select: { id: true, name: true, handle: true },
  });
  if (!target) return { error: "Rider not found." };
  if (target.id === event.hostId) return { error: "They already host this ride." };

  const previousHostId = event.hostId;

  await prisma.$transaction(async (tx) => {
    await tx.rideEvent.update({ where: { id: eventId }, data: { hostId: target.id } });

    // Demote first: the outgoing host may not have a row at all (older rides),
    // and updateMany is a no-op rather than a throw when there's nothing to hit.
    await tx.eventOrganizer.updateMany({
      where: { eventId, riderId: previousHostId, role: "HOST" },
      data: { role: "LEAD" },
    });

    // The new host may already be staff in another role — upsert moves them up.
    await tx.eventOrganizer.upsert({
      where: { eventId_riderId: { eventId, riderId: target.id } },
      create: { eventId, riderId: target.id, role: "HOST" },
      update: { role: "HOST" },
    });
  });

  await sendPushToRider(target.id, {
    title: "You're hosting a ride",
    body: `${event.host.name} handed you ${event.title}. You can manage it now.`,
    url: `/events/${event.slug}`,
    tag: `host-transfer-${eventId}`,
  }).catch(() => {});

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  return { error: null };
}

// ─── Rider Down Quick Alert ─────────────────────────────────────────

export type RiderDownResult = { error: string | null; success: boolean };

export async function riderDownAction(
  eventId: string,
  affectedRiderId: string,
  notes: string,
  locationText: string,
  lat: number | null,
  lng: number | null,
): Promise<RiderDownResult> {
  const parsed = riderDownSchema.safeParse({ affectedRiderId, notes, locationText, lat, lng });
  if (typeof eventId !== "string" || !eventId) {
    return { error: "Invalid request.", success: false };
  }
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }
  const fields = parsed.data;

  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in again.", success: false };
  }

  // Only organizers can raise an incident.
  const organizer = await prisma.eventOrganizer.findFirst({
    where: { eventId, rider: { userId } },
    select: { riderId: true },
  });
  if (!organizer) return { error: "Only ride organizers can raise an alert.", success: false };

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { title: true, slug: true },
  });
  if (!event) return { error: "Event not found.", success: false };

  const affected = await prisma.rider.findUnique({
    where: { id: fields.affectedRiderId },
    select: { id: true, name: true },
  });
  if (!affected) return { error: "Select a rider from the roster.", success: false };

  const cleanNotes = fields.notes.trim();
  const cleanLocation = fields.locationText.trim();

  const incident = await prisma.rideIncident.create({
    data: {
      eventId,
      riderId: affected.id,
      reportedById: organizer.riderId,
      notes: cleanNotes || null,
      locationText: cleanLocation || null,
      lat: fields.lat,
      lng: fields.lng,
    },
    select: { id: true },
  });

  // Notify every organizer immediately — in-app feed plus a push.
  const organizerIds = await organizerRiderIds(eventId);
  const locationSuffix = cleanLocation ? ` near ${cleanLocation}` : "";
  await logActivityForRiders(organizerIds, {
    type: "RIDER_DOWN",
    summary: `🚨 Rider down: ${affected.name} on ${event.title}${locationSuffix}`,
    refId: eventId,
    metadata: { incidentId: incident.id, affectedRiderId: affected.id },
  });

  // Emergency push — bypasses quiet hours (sendPushToRider, not pushNotifyRider)
  // because a rider-down alert has to reach organizers immediately, even
  // overnight. Best-effort per organizer; never blocks the report.
  const riderDownBody = `${affected.name} on ${event.title}${locationSuffix}. Open for details.`;

  // Email too, and forced past the opt-out: an organizer learning a rider is
  // down is not a notification preference. Push alone reaches only riders who
  // granted permission.
  await emailNotifyRiders(
    organizerIds,
    "rideChange",
    (name) => rideChangeEmail(name, `Rider down — ${event.title}`, riderDownBody, absoluteUrl(`/events/${event.slug}`)),
    { force: true },
  );

  await Promise.all(
    organizerIds.map((rid) =>
      sendPushToRider(rid, {
        title: "🚨 Rider down",
        body: riderDownBody,
        url: `/events/${event.slug}`,
        tag: `rider-down-${incident.id}`,
      }).catch(() => {}),
    ),
  );

  revalidatePath(`/events/${event.slug}`);
  return { error: null, success: true };
}

export async function resolveIncidentAction(incidentId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const incident = await prisma.rideIncident.findUnique({
    where: { id: incidentId },
    select: { eventId: true, event: { select: { slug: true } } },
  });
  if (!incident) return;

  const organizer = await prisma.eventOrganizer.findFirst({
    where: { eventId: incident.eventId, rider: { userId } },
    select: { id: true },
  });
  if (!organizer) return;

  await prisma.rideIncident.update({
    where: { id: incidentId },
    data: { resolvedAt: new Date() },
  });

  revalidatePath(`/events/${incident.event.slug}`);
}
