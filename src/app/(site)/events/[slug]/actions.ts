"use server";

import crypto from "node:crypto";

import { Prisma, RideDifficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { absoluteUrl } from "@/lib/absolute-url";
import { logActivity, logActivityForRiders } from "@/lib/activity";
import { requireUserId } from "@/lib/authz";
import { DEFAULT_TIMEZONE, isValidTimezone, zonedInputToUtc } from "@/lib/datetime";
import { eventMessageEmail, rsvpEmail } from "@/lib/email-templates";
import { emailNotifyRiders } from "@/lib/notify";
import { syncRiderProgression } from "@/lib/reputation";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { eventMessageSchema, riderDownSchema, rsvpIntentSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

// Organizer rider ids for an event (for fanning out notifications).
async function organizerRiderIds(eventId: string): Promise<string[]> {
  const organizers = await prisma.eventOrganizer.findMany({
    where: { eventId },
    select: { riderId: true },
  });
  return organizers.map((o) => o.riderId);
}

// Promote the earliest-waitlisted riders into any spots freed under maxCapacity.
async function promoteFromWaitlist(
  tx: Prisma.TransactionClient,
  eventId: string,
  eventTitle: string,
  maxCapacity: number,
) {
  const goingCount = await tx.rsvp.count({ where: { eventId, status: "GOING" } });
  const openSpots = maxCapacity - goingCount;
  if (openSpots <= 0) return;

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
  const ksuLocation = normalizeText(formData.get("ksuLocation"));
  const ksuAddress = normalizeText(formData.get("ksuAddress")).slice(0, 300);
  const ksuLat = toOptionalCoord(normalizeText(formData.get("ksuLat")), -90, 90);
  const ksuLng = toOptionalCoord(normalizeText(formData.get("ksuLng")), -180, 180);
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
        ksuLocation: ksuLocation || null,
        ksuAddress: ksuAddress || null,
        ksuLat,
        ksuLng,
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

  // CHECKED_IN reads from check-ins; the rest are RSVP states.
  let riderIds: string[];
  if (audience === "CHECKED_IN") {
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
    select: { id: true, slug: true, title: true, maxCapacity: true, rsvpDeadline: true },
  });
  if (!event) {
    return { error: "Event not found.", status: null };
  }

  if (intent === "CANCEL") {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.rsvp.findUnique({
        where: { eventId_riderId: { eventId, riderId: rider.id } },
        select: { status: true },
      });
      await tx.rsvp.deleteMany({ where: { eventId, riderId: rider.id } });

      // Freeing a GOING spot promotes the earliest waitlisted rider.
      if (existing?.status === "GOING" && event.maxCapacity != null) {
        await promoteFromWaitlist(tx, event.id, event.title, event.maxCapacity);
      }
    });

    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/events");
    return { error: null, status: "CANCELLED" };
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

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  const eventTitle = event?.title ?? "a ride";

  // Capture riders still checked in without a checkout BEFORE auto-checkout.
  const missingCheckout = await prisma.eventCheckIn.findMany({
    where: { eventId, checkOutAt: null },
    select: { rider: { select: { id: true, name: true } } },
  });

  // No-shows: riders who committed (GOING) but never checked in.
  const goingRsvps = await prisma.rsvp.findMany({
    where: { eventId, status: "GOING" },
    select: { riderId: true, rider: { select: { name: true } } },
  });
  const checkedInRiderIds = new Set(
    (await prisma.eventCheckIn.findMany({ where: { eventId }, select: { riderId: true } })).map(
      (c) => c.riderId,
    ),
  );
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
  for (const affectedRiderId of affectedRiderIds) {
    await syncRiderProgression(affectedRiderId);
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

  // Notify every organizer immediately (in-app; push/SMS is future work).
  const organizerIds = await organizerRiderIds(eventId);
  const locationSuffix = cleanLocation ? ` near ${cleanLocation}` : "";
  await logActivityForRiders(organizerIds, {
    type: "RIDER_DOWN",
    summary: `🚨 Rider down: ${affected.name} on ${event.title}${locationSuffix}`,
    refId: eventId,
    metadata: { incidentId: incident.id, affectedRiderId: affected.id },
  });

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
