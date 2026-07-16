import type { EventStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Ride statuses the public listings are allowed to show.
 *
 * Deliberately excludes CANCELLED and DRAFT:
 *   CANCELLED — the triage queue cancels a reported ride as its takedown, and a
 *               cancelled ride shouldn't keep advertising itself or taking RSVPs.
 *   DRAFT     — nothing creates drafts today (status defaults to UPCOMING), but
 *               the enum allows them, so the listings shouldn't leak one the day
 *               something starts producing them.
 *
 * The event's own page still renders for a cancelled ride — riders who signed up
 * need to see that it's off. It's the *listings* that shouldn't offer it.
 */
export const PUBLIC_EVENT_STATUSES: EventStatus[] = ["UPCOMING", "COMPLETED"];

/** A place riders have met at before, ready to reuse verbatim. */
export type MeetupSpot = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

// How many past events to read when working out where riders actually meet.
// Deep enough to cover a season, shallow enough to stay one cheap query.
const SPOT_HISTORY_DEPTH = 60;

/**
 * The places this community has met at recently, most recent first.
 *
 * A handful of venues come up again and again — the same QuikTrip, the same
 * diner — and re-searching one costs a place-search request and makes the
 * organiser retype something we already know exactly. These are stored
 * coordinates from past events, so reusing one costs nothing and lands on the
 * same spot every time, including the addresses an organiser typed by hand
 * where the map data had none.
 *
 * Community-wide rather than per-rider: the whole point is that everyone meets
 * at the same few places, and a new organiser benefits most.
 */
export async function recentMeetupSpots(): Promise<{ meet: MeetupSpot[]; ksu: MeetupSpot[] }> {
  const events = await prisma.rideEvent.findMany({
    where: { status: { in: PUBLIC_EVENT_STATUSES } },
    orderBy: { startsAt: "desc" },
    take: SPOT_HISTORY_DEPTH,
    select: {
      meetLocation: true,
      meetAddress: true,
      meetLat: true,
      meetLng: true,
      ksuLocation: true,
      ksuAddress: true,
      ksuLat: true,
      ksuLng: true,
    },
  });

  const collect = (
    pick: (e: (typeof events)[number]) => {
      name: string | null;
      address: string | null;
      lat: number | null;
      lng: number | null;
    },
  ): MeetupSpot[] => {
    const seen = new Map<string, MeetupSpot>();

    for (const event of events) {
      const { name, address, lat, lng } = pick(event);
      // Coordinates are the point: a name with no point can't be reused without
      // searching again, which is what this exists to avoid.
      if (!name || lat == null || lng == null) continue;

      // Same venue, same rough point — 4dp is ~11m, so two picks of one
      // forecourt collapse while neighbouring businesses stay distinct.
      const key = `${name.toLowerCase()}@${lat.toFixed(4)},${lng.toFixed(4)}`;
      // Events are newest-first, so the first sighting is the freshest wording
      // of the address; later duplicates are older and shouldn't overwrite it.
      if (!seen.has(key)) {
        seen.set(key, { name, address, lat, lng });
      }
    }

    return [...seen.values()].slice(0, 6);
  };

  return {
    meet: collect((e) => ({
      name: e.meetLocation,
      address: e.meetAddress,
      lat: e.meetLat,
      lng: e.meetLng,
    })),
    ksu: collect((e) => ({
      name: e.ksuLocation,
      address: e.ksuAddress,
      lat: e.ksuLat,
      lng: e.ksuLng,
    })),
  };
}
