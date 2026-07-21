import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The sub-communities a rider may file an event under — the active ones they're a
 * member (or lead) of. Filing an event into a sub-community you don't belong to
 * isn't allowed, so both the form and the server gate on this list.
 */
export async function postableCrews(riderId: string): Promise<{ id: string; name: string }[]> {
  return prisma.crew.findMany({
    where: { active: true, members: { some: { riderId } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/**
 * Validate a chosen sub-community for an event: returns the id only if the rider
 * may post to it, otherwise null (which also covers "None"). Server-side guard so
 * a tampered form can't misfile an event into someone else's sub-community.
 */
export async function resolvePostableCrewId(
  riderId: string,
  crewId: string | null,
): Promise<string | null> {
  if (!crewId) return null;
  const membership = await prisma.crewMember.findUnique({
    where: { crewId_riderId: { crewId, riderId } },
    select: { crew: { select: { active: true } } },
  });
  return membership?.crew.active ? crewId : null;
}
