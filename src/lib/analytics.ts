import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Organizer analytics — how an organizer's rides are actually doing.
 *
 * These are the organizer's own numbers, not the admin's: every query is scoped
 * to events that rider hosts or helps organize, and the page that shows them is
 * gated the same way (see /events/[slug]/analytics). Definitions match trust
 * scoring (src/lib/reputation.ts) so the dashboard never contradicts a rider's
 * profile: a "past ride" has a passed startsAt and wasn't cancelled or drafted;
 * "committed" is RSVP'd GOING; "attended" is a check-in; on-time is a check-in
 * within 15 minutes of startsAt.
 */

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;
const PUNCTUALITY_GRACE_MS = 15 * 60 * 1000;

/** Past rides this rider hosts or co-organizes — the scope for their whole view. */
function organizedPastWhere(riderId: string, now: Date): Prisma.RideEventWhereInput {
  return {
    startsAt: { lte: now },
    status: { in: ["UPCOMING", "COMPLETED"] },
    OR: [{ hostId: riderId }, { organizers: { some: { riderId } } }],
  };
}

const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ── Per-organizer, across all their rides ──────────────────────────────────

export type EventPoint = { slug: string; title: string; date: string; going: number; attended: number };

export type OrganizerAnalytics = {
  ridesHeld: number;
  conversionRate: number; // attended / committed
  noShowRate: number;
  totalGoing: number;
  totalAttended: number;
  trend: EventPoint[];
  churn: {
    priorActive: number;
    retained: number;
    churned: number;
    returningOrNew: number;
    churnRate: number;
  };
};

export async function getOrganizerAnalytics(
  riderId: string,
  now: Date = new Date(),
): Promise<OrganizerAnalytics> {
  const where = organizedPastWhere(riderId, now);
  const recentStart = new Date(now.getTime() - WINDOW_DAYS * DAY);
  const priorStart = new Date(now.getTime() - 2 * WINDOW_DAYS * DAY);

  const [events, goingByEvent, checkInsByEvent, priorRiders, recentRiders] = await Promise.all([
    prisma.rideEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
      select: { id: true, slug: true, title: true, startsAt: true },
    }),
    prisma.rsvp.groupBy({ by: ["eventId"], where: { status: "GOING", event: where }, _count: { _all: true } }),
    prisma.eventCheckIn.groupBy({ by: ["eventId"], where: { event: where }, _count: { _all: true } }),
    prisma.eventCheckIn.findMany({
      where: { checkInAt: { gte: priorStart, lt: recentStart }, event: where },
      select: { riderId: true },
      distinct: ["riderId"],
    }),
    prisma.eventCheckIn.findMany({
      where: { checkInAt: { gte: recentStart, lte: now }, event: where },
      select: { riderId: true },
      distinct: ["riderId"],
    }),
  ]);

  const goingMap = new Map(goingByEvent.map((r) => [r.eventId, r._count._all]));
  const attendedMap = new Map(checkInsByEvent.map((r) => [r.eventId, r._count._all]));

  const trend: EventPoint[] = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    date: shortDate(e.startsAt),
    going: goingMap.get(e.id) ?? 0,
    attended: attendedMap.get(e.id) ?? 0,
  }));

  const totalGoing = [...goingMap.values()].reduce((a, b) => a + b, 0);
  const totalAttended = [...attendedMap.values()].reduce((a, b) => a + b, 0);

  const priorSet = new Set(priorRiders.map((r) => r.riderId));
  const recentSet = new Set(recentRiders.map((r) => r.riderId));
  let retained = 0;
  for (const id of priorSet) if (recentSet.has(id)) retained += 1;
  let returningOrNew = 0;
  for (const id of recentSet) if (!priorSet.has(id)) returningOrNew += 1;
  const churned = priorSet.size - retained;

  return {
    ridesHeld: events.length,
    conversionRate: totalGoing > 0 ? totalAttended / totalGoing : 0,
    noShowRate: totalGoing > 0 ? Math.max(0, (totalGoing - totalAttended) / totalGoing) : 0,
    totalGoing,
    totalAttended,
    trend,
    churn: {
      priorActive: priorSet.size,
      retained,
      churned,
      returningOrNew,
      churnRate: priorSet.size > 0 ? churned / priorSet.size : 0,
    },
  };
}

// ── Per-event, this ride only ──────────────────────────────────────────────

export type EventAnalytics = {
  going: number;
  interested: number;
  waitlisted: number;
  attended: number;
  checkedOut: number;
  conversionRate: number; // attended / going
  onTime: number;
  late: number;
  noShows: { name: string; handle: string | null }[];
};

export async function getEventAnalytics(eventId: string, startsAt: Date): Promise<EventAnalytics> {
  const [rsvpGroups, checkIns, goingRsvps] = await Promise.all([
    prisma.rsvp.groupBy({ by: ["status"], where: { eventId }, _count: { _all: true } }),
    prisma.eventCheckIn.findMany({ where: { eventId }, select: { riderId: true, checkInAt: true, checkOutAt: true } }),
    prisma.rsvp.findMany({
      where: { eventId, status: "GOING" },
      select: { riderId: true, rider: { select: { name: true, handle: true } } },
    }),
  ]);

  const byStatus = new Map(rsvpGroups.map((r) => [r.status, r._count._all]));
  const going = byStatus.get("GOING") ?? 0;
  const attended = checkIns.length;
  const checkedInIds = new Set(checkIns.map((c) => c.riderId));

  const cutoff = startsAt.getTime() + PUNCTUALITY_GRACE_MS;
  const onTime = checkIns.filter((c) => c.checkInAt.getTime() <= cutoff).length;

  const noShows = goingRsvps
    .filter((r) => !checkedInIds.has(r.riderId))
    .map((r) => ({ name: r.rider.name, handle: r.rider.handle }));

  return {
    going,
    interested: byStatus.get("INTERESTED") ?? 0,
    waitlisted: byStatus.get("WAITLISTED") ?? 0,
    attended,
    checkedOut: checkIns.filter((c) => c.checkOutAt !== null).length,
    conversionRate: going > 0 ? attended / going : 0,
    onTime,
    late: attended - onTime,
    noShows,
  };
}
