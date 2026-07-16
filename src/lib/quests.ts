import type { QuestCriteria } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type QuestProgress = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  completed: boolean;
  completedAt: Date | null;
};

// A profile counts as complete once it says something real about the rider —
// a bio and a location, plus an avatar so they're recognisable at a meet.
async function hasCompleteProfile(riderId: string): Promise<boolean> {
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    select: { bio: true, location: true, avatarUrl: true },
  });

  return Boolean(rider?.bio?.trim() && rider.location?.trim() && rider.avatarUrl);
}

/**
 * Whether a quest can be completed at all right now.
 *
 * "Accept the guidelines" depends on an admin having published a required
 * policy. With none published there is nothing to accept, so the step can never
 * be ticked — showing it would be a dead end pointing at an empty page. Hide it
 * instead, and let it appear once there is a policy behind it.
 */
async function isApplicable(criteria: QuestCriteria): Promise<boolean> {
  if (criteria !== "ACCEPT_POLICIES") return true;

  const required = await prisma.policy.count({ where: { active: true, required: true } });
  return required > 0;
}

async function isSatisfied(criteria: QuestCriteria, riderId: string): Promise<boolean> {
  switch (criteria) {
    case "COMPLETE_PROFILE":
      return hasCompleteProfile(riderId);
    case "ADD_BIKE":
      return (await prisma.bike.count({ where: { riderId } })) > 0;
    case "RSVP_EVENT":
      return (await prisma.rsvp.count({ where: { riderId, status: "GOING" } })) > 0;
    case "ATTEND_EVENT":
      return (await prisma.eventCheckIn.count({ where: { riderId } })) > 0;
    case "POST_JOURNAL":
      return (await prisma.journalEntry.count({ where: { authorId: riderId } })) > 0;
    case "ADD_EMERGENCY_CARD":
      return (await prisma.emergencyCard.count({ where: { riderId, active: true } })) > 0;
    case "FOLLOW_RIDER":
      return (await prisma.riderFollow.count({ where: { followerId: riderId } })) > 0;
    case "ACCEPT_POLICIES": {
      // Every active required policy must be accepted at its current version.
      const policies = await prisma.policy.findMany({
        where: { active: true, required: true },
        select: { version: true, acknowledgments: { where: { riderId }, select: { version: true } } },
      });
      if (policies.length === 0) return false;
      return policies.every((policy) =>
        policy.acknowledgments.some((ack) => ack.version === policy.version),
      );
    }
    default:
      return false;
  }
}

/**
 * Evaluate every active quest for a rider and persist newly completed ones.
 *
 * Completion is latched: once a RiderQuest row exists the quest stays done even
 * if the underlying data changes later (a bike sold, a journal entry deleted).
 * Onboarding is a thing you finished, not a state you must maintain.
 */
export async function evaluateQuests(riderId: string): Promise<QuestProgress[]> {
  const [quests, completedRows] = await Promise.all([
    prisma.quest.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.riderQuest.findMany({ where: { riderId }, select: { questId: true, completedAt: true } }),
  ]);

  const completedById = new Map(completedRows.map((row) => [row.questId, row.completedAt]));
  const newlyCompleted: string[] = [];

  const progress: QuestProgress[] = [];

  for (const quest of quests) {
    const alreadyDone = completedById.get(quest.id);
    let completedAt = alreadyDone ?? null;

    // A quest already completed stays listed even if it later stops applying;
    // only un-earned, un-completable steps are hidden.
    if (!alreadyDone && !(await isApplicable(quest.criteria))) {
      continue;
    }

    if (!alreadyDone && (await isSatisfied(quest.criteria, riderId))) {
      completedAt = new Date();
      newlyCompleted.push(quest.id);
    }

    progress.push({
      id: quest.id,
      slug: quest.slug,
      name: quest.name,
      description: quest.description,
      icon: quest.icon,
      href: quest.href,
      completed: completedAt !== null,
      completedAt,
    });
  }

  if (newlyCompleted.length > 0) {
    await prisma.riderQuest.createMany({
      data: newlyCompleted.map((questId) => ({ riderId, questId })),
      skipDuplicates: true,
    });
  }

  return progress;
}
