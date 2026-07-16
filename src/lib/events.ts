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

// Two picks of one forecourt land a few metres apart, and a place can be indexed
// under more than one name — the Rossview Road QuikTrip comes back as "QuikTrip"
// or "QuikTrip Certified Scale" depending on the search. Anything within this is
// the same place however it was labelled.
const SAME_PLACE_MILES = 0.031; // ~50 m

function milesBetween(a: [number, number], b: [number, number]): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const [aLng, aLat] = a;
  const [bLng, bLat] = b;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

type EventLocations = {
  meetLocation: string | null;
  meetLat: number | null;
  meetLng: number | null;
  ksuLocation: string | null;
  ksuLat: number | null;
  ksuLng: number | null;
};

/**
 * Whether kickstands-up happens somewhere other than the meetup.
 *
 * Almost always false. A normal ride meets at one place and departs from it —
 * kickstands up is a *time*, not a second address. The KSU location only earns
 * its own card when a ride genuinely stages elsewhere, and then riders need it:
 * turning up at the meetup and missing that the group leaves from somewhere else
 * is how someone gets left behind.
 *
 * Compares the point as well as the name, because the same forecourt can be
 * labelled two ways and shouldn't render as two places.
 */
export function ksuLocationDiffers(event: EventLocations): boolean {
  const ksu = event.ksuLocation?.trim();
  if (!ksu) return false;

  const meet = event.meetLocation?.trim();
  // No meetup to compare against: whatever KSU says is the only location there is.
  if (!meet) return true;

  if (ksu.toLowerCase() === meet.toLowerCase()) return false;

  if (event.meetLat != null && event.meetLng != null && event.ksuLat != null && event.ksuLng != null) {
    const apart = milesBetween([event.meetLng, event.meetLat], [event.ksuLng, event.ksuLat]);
    if (apart <= SAME_PLACE_MILES) return false;
  }

  return true;
}

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
