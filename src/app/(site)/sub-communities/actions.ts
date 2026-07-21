"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type CrewActionState = { error: string | null; success: string | null };
export type CrewFormState = { error: string | null; success: string | null };

// Same intent as the challenge guardrails: keep an open door from filling the
// place with abandoned crews.
const MAX_CREWS_LED_PER_RIDER = 3;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Start a crew as a member.
 *
 * The creator becomes its LEAD — a crew with no lead can't be managed, and
 * whoever starts it is the obvious first one. leaveCrewAction already refuses
 * to let the last lead walk out, so the crew can never be orphaned.
 */
export async function createCrewAction(
  _previous: CrewFormState,
  formData: FormData,
): Promise<CrewFormState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in to start a sub-community.", success: null };
  }

  const name = (formData.get("name")?.toString() ?? "").trim();
  const description = (formData.get("description")?.toString() ?? "").trim();
  const open = formData.get("open") === "on";

  if (!name || name.length > 80) {
    return { error: "Give the sub-community a name (80 characters or fewer).", success: null };
  }

  if (!description || description.length > 300) {
    return { error: "Say what the sub-community is about, in 300 characters or fewer.", success: null };
  }

  const slug = slugify(name);
  if (!slug) {
    return { error: "That name can't be turned into a web address. Try letters and numbers.", success: null };
  }

  const clash = await prisma.crew.findUnique({ where: { slug }, select: { id: true } });
  if (clash) {
    return { error: "A sub-community with that name already exists. Pick another.", success: null };
  }

  const led = await prisma.crewMember.count({
    where: { riderId, role: "LEAD", crew: { active: true } },
  });
  if (led >= MAX_CREWS_LED_PER_RIDER) {
    return {
      error: `You already lead ${MAX_CREWS_LED_PER_RIDER} sub-communities. Hand one over before starting another.`,
      success: null,
    };
  }

  const crew = await prisma.crew.create({
    data: {
      slug,
      name,
      description,
      open,
      members: { create: { riderId, role: "LEAD" } },
    },
    select: { slug: true },
  });

  revalidatePath("/sub-communities");
  redirect(`/sub-communities/${crew.slug}`);
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

export async function joinCrewAction(crewSlug: string): Promise<CrewActionState> {
  const riderId = await currentRiderId();
  if (!riderId) {
    return { error: "Please log in to join a sub-community.", success: null };
  }

  const crew = await prisma.crew.findUnique({
    where: { slug: crewSlug },
    select: { id: true, name: true, open: true, active: true },
  });

  if (!crew || !crew.active) {
    return { error: "That sub-community doesn't exist.", success: null };
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

  revalidatePath(`/sub-communities/${crewSlug}`);
  revalidatePath("/sub-communities");

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
    return { error: "That sub-community doesn't exist.", success: null };
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
      return { error: "Hand the sub-community to another lead before you leave.", success: null };
    }
  }

  await prisma.crewMember.delete({
    where: { crewId_riderId: { crewId: crew.id, riderId } },
  });

  revalidatePath(`/sub-communities/${crewSlug}`);
  revalidatePath("/sub-communities");

  return { error: null, success: `You left ${crew.name}.` };
}
