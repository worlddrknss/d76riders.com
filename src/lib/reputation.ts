import type { Prisma, PrismaClient, TrustLevel } from "@prisma/client";

import { syncRiderChallenges } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

// How late a rider may check in and still count as punctual. Group rides have a
// meet time before KSU, so a few minutes either side of the start is normal.
const PUNCTUALITY_GRACE_MINUTES = 15;

// Score weights, out of 100. Attendance dominates because showing up when you
// said you would is the signal other riders actually care about.
const WEIGHT_ATTENDANCE = 40;
const WEIGHT_PUNCTUALITY = 25;
const WEIGHT_SAFETY = 15;
const WEIGHT_VOLUME = 20;

// Rides attended at which the volume component maxes out.
const VOLUME_SATURATION = 12;

// A level needs both a score and a real ride count behind it — otherwise a rider
// with one perfect ride would outrank a veteran with a single no-show. The ride
// count spans group check-ins and self-logged rides (see totalRides).
const LEVELS: { level: TrustLevel; minScore: number; minRides: number }[] = [
  { level: "VETERAN", minScore: 85, minRides: 10 },
  { level: "TRUSTED", minScore: 70, minRides: 5 },
  { level: "ESTABLISHED", minScore: 45, minRides: 2 },
  { level: "NEW", minScore: 0, minRides: 0 },
];

export type TrustSignals = {
  eventsAttended: number;
  eventsCommitted: number;
  noShows: number;
  onTimeCheckIns: number;
  milesRidden: number;
  attendanceRate: number;
  punctualityRate: number;
  safetyAcked: boolean;
  score: number;
  level: TrustLevel;
};

function levelFor(score: number, totalRides: number): TrustLevel {
  for (const tier of LEVELS) {
    if (score >= tier.minScore && totalRides >= tier.minRides) {
      return tier.level;
    }
  }
  return "NEW";
}

/**
 * Compute a rider's trust signals from their actual ride history.
 *
 * Only events that have already happened count — a rider isn't penalised for an
 * upcoming ride they haven't attended yet. "Committed" means they RSVP'd GOING
 * to a past event; attendance is measured against that, since never RSVPing
 * shouldn't produce a 0% attendance rate.
 */
export async function computeTrustSignals(riderId: string, db: Db = prisma): Promise<TrustSignals> {
  const now = new Date();

  const [checkIns, committedRsvps, rideLogs, safetyWaivers] = await Promise.all([
    db.eventCheckIn.findMany({
      where: { riderId, event: { startsAt: { lte: now } } },
      select: {
        checkInAt: true,
        event: { select: { startsAt: true, distanceMiles: true } },
      },
    }),
    db.rsvp.count({
      where: { riderId, status: "GOING", event: { startsAt: { lte: now } } },
    }),
    // Self-logged rides count as real riding: they feed mileage, the volume
    // component, and the level's ride-count gate. They deliberately do NOT touch
    // attendance/punctuality — those stay group-ride commitment signals, so the
    // higher tiers still require showing up to organized rides, not just logging.
    db.rideLog.aggregate({
      where: { riderId, riddenAt: { lte: now } },
      _count: { _all: true },
      _sum: { distanceMiles: true },
    }),
    // Ties into Phase 13: accepting the current safety waiver is a trust signal.
    // The rider's acknowledgment must match the waiver's current version, which
    // is a column-to-column comparison — so match it in code, not in the query.
    db.policy.findMany({
      where: { type: "SAFETY_WAIVER", active: true },
      select: {
        version: true,
        acknowledgments: { where: { riderId }, select: { version: true } },
      },
    }),
  ]);

  const eventsAttended = checkIns.length;
  const ridesLogged = rideLogs._count._all;
  const loggedMiles = rideLogs._sum.distanceMiles ?? 0;
  const eventMiles = checkIns.reduce((sum, ci) => sum + (ci.event.distanceMiles ?? 0), 0);
  const milesRidden = eventMiles + loggedMiles;

  // Total rides across group check-ins and self-logged rides — drives the volume
  // score and the level gate, so real riding outside organized events still
  // moves you up.
  const totalRides = eventsAttended + ridesLogged;

  const onTimeCheckIns = checkIns.filter((ci) => {
    const deadline = new Date(ci.event.startsAt.getTime() + PUNCTUALITY_GRACE_MINUTES * 60 * 1000);
    return ci.checkInAt <= deadline;
  }).length;

  // Someone can attend without RSVPing, so committed is at least attendance —
  // this keeps attendanceRate from exceeding 1.
  const eventsCommitted = Math.max(committedRsvps, eventsAttended);
  const noShows = Math.max(0, committedRsvps - eventsAttended);

  const attendanceRate = eventsCommitted > 0 ? eventsAttended / eventsCommitted : 0;
  const punctualityRate = eventsAttended > 0 ? onTimeCheckIns / eventsAttended : 0;
  // Accepted every active waiver at its current version. With no waiver
  // published, there is nothing to accept, so this stays false rather than
  // handing every rider free points.
  const safetyAcked =
    safetyWaivers.length > 0 &&
    safetyWaivers.every((waiver) => waiver.acknowledgments.some((ack) => ack.version === waiver.version));

  // A rider with no history sits at 0 rather than inheriting a full attendance
  // score from an empty denominator.
  const hasHistory = eventsAttended > 0 || eventsCommitted > 0 || ridesLogged > 0;

  const score = hasHistory
    ? Math.round(
        attendanceRate * WEIGHT_ATTENDANCE +
          punctualityRate * WEIGHT_PUNCTUALITY +
          (safetyAcked ? WEIGHT_SAFETY : 0) +
          Math.min(1, totalRides / VOLUME_SATURATION) * WEIGHT_VOLUME,
      )
    : 0;

  return {
    eventsAttended,
    eventsCommitted,
    noShows,
    onTimeCheckIns,
    milesRidden,
    attendanceRate,
    punctualityRate,
    safetyAcked,
    score,
    level: levelFor(score, totalRides),
  };
}

// Recompute and persist a rider's trust snapshot.
export async function refreshRiderTrust(riderId: string, db: Db = prisma): Promise<TrustSignals> {
  const signals = await computeTrustSignals(riderId, db);

  const data = {
    score: signals.score,
    level: signals.level,
    eventsAttended: signals.eventsAttended,
    eventsCommitted: signals.eventsCommitted,
    noShows: signals.noShows,
    onTimeCheckIns: signals.onTimeCheckIns,
    milesRidden: signals.milesRidden,
    attendanceRate: signals.attendanceRate,
    punctualityRate: signals.punctualityRate,
    safetyAcked: signals.safetyAcked,
    computedAt: new Date(),
  };

  await db.riderTrust.upsert({
    where: { riderId },
    create: { riderId, ...data },
    update: data,
  });

  return signals;
}

/**
 * Award any badges the rider now qualifies for, and return the newly earned ones.
 *
 * Badges are additive only — losing a signal never revokes a badge a rider has
 * already earned, which is why this never deletes RiderBadge rows.
 */
export async function evaluateBadges(riderId: string, db: Db = prisma): Promise<string[]> {
  const [badges, existing, signals] = await Promise.all([
    db.badge.findMany({ where: { active: true } }),
    db.riderBadge.findMany({ where: { riderId }, select: { badgeId: true } }),
    computeTrustSignals(riderId, db),
  ]);

  if (badges.length === 0) return [];

  const held = new Set(existing.map((row) => row.badgeId));

  // Only queried if a badge actually needs them.
  let eventsOrganized: number | null = null;
  let mentorSkills: number | null = null;

  const earned: string[] = [];

  for (const badge of badges) {
    if (held.has(badge.id)) continue;

    let qualifies = false;

    switch (badge.criteria) {
      case "EVENTS_ATTENDED":
        qualifies = signals.eventsAttended >= badge.threshold;
        break;
      case "MILES_RIDDEN":
        qualifies = signals.milesRidden >= badge.threshold;
        break;
      case "SAFETY_ACKNOWLEDGED":
        qualifies = signals.safetyAcked;
        break;
      case "EVENTS_ORGANIZED":
        eventsOrganized ??= await db.eventOrganizer.count({
          where: { riderId, event: { status: "COMPLETED" } },
        });
        qualifies = eventsOrganized >= badge.threshold;
        break;
      case "MENTOR":
        mentorSkills ??= await db.riderSkill.count({
          where: { riderId, level: "MENTOR", verifiedAt: { not: null } },
        });
        qualifies = mentorSkills >= badge.threshold;
        break;
      // Granted by hand from /admin/badges, never auto-awarded.
      case "MANUAL":
      default:
        qualifies = false;
    }

    if (qualifies) {
      earned.push(badge.id);
    }
  }

  if (earned.length === 0) return [];

  // A concurrent award (two rides closing at once) would collide on the unique
  // constraint; skipDuplicates makes this idempotent.
  await db.riderBadge.createMany({
    data: earned.map((badgeId) => ({ riderId, badgeId })),
    skipDuplicates: true,
  });

  return earned;
}

// Refresh trust, award badges, and score challenges together, then notify the
// rider of anything new. Called after a ride closes and after a check-in.
export async function syncRiderProgression(riderId: string): Promise<void> {
  await refreshRiderTrust(riderId);
  const earnedIds = await evaluateBadges(riderId);

  // Challenges hang off the same hooks as trust and badges — the evidence is the
  // same check-ins, so scoring them anywhere else would drift.
  await syncRiderChallenges(riderId);

  if (earnedIds.length === 0) return;

  const badges = await prisma.badge.findMany({
    where: { id: { in: earnedIds } },
    select: { id: true, name: true },
  });

  await prisma.activity.createMany({
    data: badges.map((badge) => ({
      riderId,
      type: "BADGE_EARNED" as const,
      summary: `You earned the ${badge.name} badge`,
      refId: badge.id,
    })),
  });
}

export const TRUST_LEVEL_LABEL: Record<TrustLevel, string> = {
  NEW: "New Rider",
  ESTABLISHED: "Established",
  TRUSTED: "Trusted",
  VETERAN: "Veteran",
};
