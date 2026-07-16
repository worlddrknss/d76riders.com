import type { Challenge, ChallengeMetric } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Score one rider against one challenge.
 *
 * Only evidence from inside the challenge window counts. That's the whole point
 * of a challenge as opposed to a badge: joining on the last day shouldn't
 * instantly complete it from a rider's back catalogue.
 *
 * Progress is always recomputed from check-ins rather than incremented, for the
 * same reason trust is (src/lib/reputation.ts): a counter drifts from the data
 * it claims to summarise, and can't be audited.
 */
export async function computeChallengeProgress(
  challenge: Pick<Challenge, "metric" | "startsAt" | "endsAt">,
  riderId: string,
): Promise<number> {
  const window = { gte: challenge.startsAt, lte: challenge.endsAt };

  switch (challenge.metric) {
    case "MILES_RIDDEN": {
      const checkIns = await prisma.eventCheckIn.findMany({
        where: { riderId, event: { startsAt: window } },
        select: { event: { select: { distanceMiles: true } } },
      });
      return checkIns.reduce((sum, row) => sum + (row.event.distanceMiles ?? 0), 0);
    }

    case "EVENTS_ATTENDED":
      return prisma.eventCheckIn.count({
        where: { riderId, event: { startsAt: window } },
      });

    case "EVENTS_ORGANIZED":
      return prisma.eventOrganizer.count({
        where: { riderId, event: { status: "COMPLETED", startsAt: window } },
      });

    default:
      return 0;
  }
}

/**
 * Recompute every entry this rider holds in a live challenge, and return the
 * challenges they just finished.
 *
 * Entries are only scored for challenges the rider opted into — a challenge
 * nobody joined is a chart, not a competition.
 */
export async function syncRiderChallenges(riderId: string): Promise<string[]> {
  const entries = await prisma.challengeEntry.findMany({
    where: {
      riderId,
      // Finished entries are left alone: completion latches.
      completedAt: null,
      challenge: { active: true },
    },
    select: {
      id: true,
      progress: true,
      challenge: {
        select: { id: true, name: true, metric: true, goal: true, startsAt: true, endsAt: true, badgeId: true },
      },
    },
  });

  const completed: string[] = [];

  for (const entry of entries) {
    const progress = Math.round(await computeChallengeProgress(entry.challenge, riderId));
    const isComplete = progress >= entry.challenge.goal;

    if (progress === entry.progress && !isComplete) continue;

    await prisma.challengeEntry.update({
      where: { id: entry.id },
      data: {
        progress,
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (!isComplete) continue;

    completed.push(entry.challenge.name);

    await prisma.activity.create({
      data: {
        riderId,
        type: "CHALLENGE_COMPLETED",
        summary: `You finished the ${entry.challenge.name} challenge`,
        refId: entry.challenge.id,
      },
    });

    // Reuse the badge case rather than inventing a second trophy shelf.
    if (entry.challenge.badgeId) {
      await prisma.riderBadge.createMany({
        data: [{ riderId, badgeId: entry.challenge.badgeId }],
        skipDuplicates: true,
      });
    }
  }

  return completed;
}

export type ChallengeStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export function challengeStatus(
  challenge: Pick<Challenge, "startsAt" | "endsAt">,
  now = new Date(),
): ChallengeStatus {
  if (now < challenge.startsAt) return "UPCOMING";
  if (now > challenge.endsAt) return "ENDED";
  return "ACTIVE";
}

export const METRIC_LABEL: Record<ChallengeMetric, string> = {
  MILES_RIDDEN: "miles",
  EVENTS_ATTENDED: "rides",
  EVENTS_ORGANIZED: "rides organized",
};

// "312 / 500 miles"
export function formatProgress(progress: number, goal: number, metric: ChallengeMetric): string {
  return `${progress.toLocaleString()} / ${goal.toLocaleString()} ${METRIC_LABEL[metric]}`;
}

export function daysLeft(endsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}
