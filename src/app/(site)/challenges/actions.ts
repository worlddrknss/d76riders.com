"use server";

import { ChallengeMetric } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { computeChallengeProgress } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ChallengeActionState = { error: string | null; success: string | null };
export type ChallengeFormState = { error: string | null; success: string | null };

// Guardrails for member-created challenges. Admins aren't bound by these — the
// point is to keep an open door from producing a wall of junk, not to police
// what a challenge can be.
const MAX_OPEN_CHALLENGES_PER_RIDER = 3;
const MAX_WINDOW_DAYS = 366;
const MAX_GOAL = 100_000;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Create a challenge as a member.
 *
 * Challenges are a community thing, not an admin thing — any rider can set one.
 * The creator is recorded so it can be attributed and retired by them, and so
 * an abusive one has a name attached for moderation.
 */
export async function createChallengeAction(
  _previous: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in to set a challenge.", success: null };
  }

  const name = (formData.get("name")?.toString() ?? "").trim();
  const description = (formData.get("description")?.toString() ?? "").trim();
  const metric = formData.get("metric")?.toString() ?? "";
  const goal = Number.parseInt(formData.get("goal")?.toString() ?? "", 10);
  const startsAt = new Date(formData.get("startsAt")?.toString() ?? "");
  const endsAt = new Date(formData.get("endsAt")?.toString() ?? "");
  const crewId = formData.get("crewId")?.toString() || null;

  if (!name || name.length > 120) {
    return { error: "Give it a name (120 characters or fewer).", success: null };
  }

  if (!Object.values(ChallengeMetric).includes(metric as ChallengeMetric)) {
    return { error: "Pick what it's measured on.", success: null };
  }

  if (!Number.isFinite(goal) || goal <= 0 || goal > MAX_GOAL) {
    return { error: `The goal must be between 1 and ${MAX_GOAL.toLocaleString()}.`, success: null };
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Set a start and an end date.", success: null };
  }

  if (endsAt <= startsAt) {
    return { error: "It has to end after it starts.", success: null };
  }

  const windowDays = (endsAt.getTime() - startsAt.getTime()) / (24 * 60 * 60 * 1000);
  if (windowDays > MAX_WINDOW_DAYS) {
    return { error: "Keep it to a year or less — that's what makes it a challenge.", success: null };
  }

  if (endsAt < new Date()) {
    return { error: "That window has already closed.", success: null };
  }

  // A crew challenge has to be one you're actually in.
  if (crewId) {
    const membership = await prisma.crewMember.findUnique({
      where: { crewId_riderId: { crewId, riderId } },
      select: { id: true },
    });
    if (!membership) {
      return { error: "You can only set a challenge for a crew you're in.", success: null };
    }
  }

  const openCount = await prisma.challenge.count({
    where: { createdByRiderId: riderId, active: true, endsAt: { gte: new Date() } },
  });
  if (openCount >= MAX_OPEN_CHALLENGES_PER_RIDER) {
    return {
      error: `You already have ${MAX_OPEN_CHALLENGES_PER_RIDER} challenges running. Let one finish first.`,
      success: null,
    };
  }

  // Slugs are global, so make room for two riders naming theirs the same thing.
  const base = slugify(name) || "challenge";
  let slug = base;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const clash = await prisma.challenge.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${base}-${attempt}`;
  }

  const challenge = await prisma.challenge.create({
    data: {
      slug,
      name,
      description: description || name,
      metric: metric as ChallengeMetric,
      goal,
      startsAt,
      endsAt,
      crewId,
      createdByRiderId: riderId,
    },
    select: { id: true, slug: true, name: true, goal: true, metric: true, startsAt: true, endsAt: true },
  });

  // The setter is in it by default — nobody sets a challenge they're not riding.
  const progress = Math.round(await computeChallengeProgress(challenge, riderId));
  await prisma.challengeEntry.create({
    data: {
      challengeId: challenge.id,
      riderId,
      progress,
      completedAt: progress >= challenge.goal ? new Date() : null,
    },
  });

  revalidatePath("/challenges");
  redirect(`/challenges/${challenge.slug}`);
}

/**
 * Retire a challenge you set.
 *
 * Deactivated rather than deleted: riders joined it and have progress, and
 * wiping that because the setter changed their mind would erase their record.
 * Admins can delete outright from /admin/community.
 */
export async function retireChallengeAction(slug: string): Promise<ChallengeActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in.", success: null };
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, name: true, createdByRiderId: true },
  });

  if (!challenge) {
    return { error: "That challenge doesn't exist.", success: null };
  }

  if (challenge.createdByRiderId !== riderId) {
    return { error: "Only whoever set this challenge can retire it.", success: null };
  }

  await prisma.challenge.update({ where: { id: challenge.id }, data: { active: false } });

  revalidatePath("/challenges");
  return { error: null, success: `Retired ${challenge.name}.` };
}

async function currentRiderId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });
  return rider?.id ?? null;
}

/**
 * Opt into a challenge.
 *
 * Progress is scored from the moment of joining onward — but computed over the
 * whole window, so a rider who joins mid-challenge still gets credit for rides
 * they did after it started. What they don't get is credit for rides before it
 * started; that's what makes the window meaningful.
 */
export async function joinChallengeAction(slug: string): Promise<ChallengeActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in to join a challenge.", success: null };
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      active: true,
      endsAt: true,
      metric: true,
      startsAt: true,
      goal: true,
      crewId: true,
    },
  });

  if (!challenge || !challenge.active) {
    return { error: "That challenge doesn't exist.", success: null };
  }

  if (challenge.endsAt < new Date()) {
    return { error: "That challenge has already ended.", success: null };
  }

  // Crew-scoped challenges are for that crew's members.
  if (challenge.crewId) {
    const membership = await prisma.crewMember.findUnique({
      where: { crewId_riderId: { crewId: challenge.crewId, riderId } },
      select: { id: true },
    });
    if (!membership) {
      return { error: "This challenge is for a crew you're not in yet.", success: null };
    }
  }

  // Seed progress immediately so the rider sees where they already stand within
  // the window, rather than a zero that corrects itself after the next ride.
  const progress = Math.round(await computeChallengeProgress(challenge, riderId));

  await prisma.challengeEntry.upsert({
    where: { challengeId_riderId: { challengeId: challenge.id, riderId } },
    create: {
      challengeId: challenge.id,
      riderId,
      progress,
      completedAt: progress >= challenge.goal ? new Date() : null,
    },
    update: {},
  });

  await prisma.activity.create({
    data: {
      riderId,
      type: "CHALLENGE_JOINED",
      summary: `You joined the ${challenge.name} challenge`,
      refId: challenge.id,
    },
  });

  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/challenges");

  return { error: null, success: `You're in — ${challenge.name}.` };
}

export async function leaveChallengeAction(slug: string): Promise<ChallengeActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in.", success: null };
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!challenge) {
    return { error: "That challenge doesn't exist.", success: null };
  }

  await prisma.challengeEntry.deleteMany({
    where: { challengeId: challenge.id, riderId },
  });

  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/challenges");

  return { error: null, success: `You left ${challenge.name}.` };
}
