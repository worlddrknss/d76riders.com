"use server";

import { requireUserId } from "@/lib/authz";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type LivePosition = {
  riderId: string;
  name: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  updatedAt: string;
};

// A position older than this is treated as offline (rider stopped sharing or
// their phone backgrounded the tab).
const STALE_MS = 5 * 60 * 1000;

async function viewerRiderId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  return rider?.id ?? null;
}

async function isCheckedIn(eventId: string, riderId: string): Promise<boolean> {
  const ci = await prisma.eventCheckIn.findUnique({
    where: { eventId_riderId: { eventId, riderId } },
    select: { checkOutAt: true },
  });
  return Boolean(ci && ci.checkOutAt == null);
}

async function isParticipant(eventId: string, riderId: string, userId: string): Promise<boolean> {
  const [org, ci, rsvp] = await Promise.all([
    prisma.eventOrganizer.findFirst({ where: { eventId, rider: { userId } }, select: { id: true } }),
    prisma.eventCheckIn.findUnique({ where: { eventId_riderId: { eventId, riderId } }, select: { id: true } }),
    prisma.rsvp.findFirst({ where: { eventId, riderId, status: "GOING" }, select: { id: true } }),
  ]);
  return Boolean(org || ci || rsvp);
}

/** Only riders currently checked in to the ride can broadcast their position. */
export async function updateLiveLocationAction(eventId: string, lat: number, lng: number): Promise<{ ok: boolean }> {
  const riderId = await viewerRiderId();
  if (!riderId) return { ok: false };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false };
  }
  if (!(await isCheckedIn(eventId, riderId))) return { ok: false };

  await prisma.liveLocation.upsert({
    where: { eventId_riderId: { eventId, riderId } },
    create: { eventId, riderId, lat, lng },
    update: { lat, lng },
  });
  return { ok: true };
}

export async function stopSharingLocationAction(eventId: string): Promise<void> {
  const riderId = await viewerRiderId();
  if (!riderId) return;
  await prisma.liveLocation.deleteMany({ where: { eventId, riderId } });
}

/** Live positions of everyone sharing — visible only to ride participants. */
export async function fetchLiveLocationsAction(eventId: string): Promise<LivePosition[]> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return [];
  }
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider || !(await isParticipant(eventId, rider.id, userId))) return [];

  const since = new Date(Date.now() - STALE_MS);
  const rows = await prisma.liveLocation.findMany({
    where: { eventId, updatedAt: { gte: since } },
    select: { lat: true, lng: true, updatedAt: true, rider: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return rows.map((r) => ({
    riderId: r.rider.id,
    name: r.rider.name,
    avatarUrl: mediaUrl(r.rider.avatarUrl),
    lat: r.lat,
    lng: r.lng,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
