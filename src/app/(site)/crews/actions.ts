"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type CrewActionState = { error: string | null; success: string | null };

async function currentRiderId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  return rider?.id ?? null;
}

export async function joinCrewAction(crewSlug: string): Promise<CrewActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in to join a crew.", success: null };
  }

  const crew = await prisma.crew.findUnique({
    where: { slug: crewSlug },
    select: { id: true, name: true, open: true, active: true },
  });

  if (!crew || !crew.active) {
    return { error: "That crew doesn't exist.", success: null };
  }

  // Closed crews are managed by their leads — joining is by invitation only.
  if (!crew.open) {
    return { error: `${crew.name} is invite-only. Ask a crew lead to add you.`, success: null };
  }

  await prisma.crewMember.upsert({
    where: { crewId_riderId: { crewId: crew.id, riderId } },
    create: { crewId: crew.id, riderId },
    update: {},
  });

  revalidatePath(`/crews/${crewSlug}`);
  revalidatePath("/crews");

  return { error: null, success: `You joined ${crew.name}.` };
}

export async function leaveCrewAction(crewSlug: string): Promise<CrewActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in.", success: null };
  }

  const crew = await prisma.crew.findUnique({
    where: { slug: crewSlug },
    select: { id: true, name: true },
  });

  if (!crew) {
    return { error: "That crew doesn't exist.", success: null };
  }

  const membership = await prisma.crewMember.findUnique({
    where: { crewId_riderId: { crewId: crew.id, riderId } },
    select: { role: true },
  });

  if (!membership) {
    return { error: null, success: null };
  }

  // Don't let the last lead walk out and leave the crew unmanageable.
  if (membership.role === "LEAD") {
    const leadCount = await prisma.crewMember.count({
      where: { crewId: crew.id, role: "LEAD" },
    });
    if (leadCount <= 1) {
      return { error: "Hand the crew to another lead before you leave.", success: null };
    }
  }

  await prisma.crewMember.delete({
    where: { crewId_riderId: { crewId: crew.id, riderId } },
  });

  revalidatePath(`/crews/${crewSlug}`);
  revalidatePath("/crews");

  return { error: null, success: `You left ${crew.name}.` };
}
