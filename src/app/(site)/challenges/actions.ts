"use server";

import { revalidatePath } from "next/cache";

import { computeChallengeProgress } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ChallengeActionState = { error: string | null; success: string | null };

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
