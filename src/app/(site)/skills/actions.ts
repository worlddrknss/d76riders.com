"use server";

import { SkillLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { syncRiderProgression } from "@/lib/reputation";
import { getCurrentUser } from "@/lib/session";

export type SkillFormState = { error: string | null; success: string | null };

// Levels a rider may claim for themselves. MENTOR is deliberately excluded —
// it carries a badge and real weight, so only an organizer can confer it.
const SELF_REPORTABLE: SkillLevel[] = ["LEARNING", "PRACTICING", "PROFICIENT"];

export async function setMySkillAction(skillSlug: string, level: string): Promise<SkillFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { error: "Please log in to track skills.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });
  if (!rider) {
    return { error: "No rider profile found.", success: null };
  }

  const skill = await prisma.skillTrack.findUnique({
    where: { slug: skillSlug },
    select: { id: true, active: true, name: true },
  });
  if (!skill || !skill.active) {
    return { error: "That skill track doesn't exist.", success: null };
  }

  // Empty level means "stop tracking this skill" — drop the row entirely so the
  // rider isn't left showing a level they no longer claim.
  if (level === "") {
    await prisma.riderSkill.deleteMany({ where: { riderId: rider.id, skillId: skill.id } });
    revalidatePath("/skills");
    revalidatePath(`/r/${currentUser.handle ?? ""}`);
    return { error: null, success: `Stopped tracking ${skill.name}.` };
  }

  if (!SELF_REPORTABLE.includes(level as SkillLevel)) {
    return { error: "Mentor level has to be verified by an organizer.", success: null };
  }

  // Self-reporting resets verification: the claim has changed, so a previous
  // organizer sign-off no longer describes it.
  await prisma.riderSkill.upsert({
    where: { riderId_skillId: { riderId: rider.id, skillId: skill.id } },
    create: { riderId: rider.id, skillId: skill.id, level: level as SkillLevel },
    update: { level: level as SkillLevel, verifiedByRiderId: null, verifiedAt: null },
  });

  revalidatePath("/skills");
  revalidatePath(`/r/${currentUser.handle ?? ""}`);

  return { error: null, success: `Updated ${skill.name}.` };
}

/**
 * Verify another rider's skill, optionally promoting them to MENTOR.
 *
 * Only riders who have actually led rides can verify — an organizer role on at
 * least one completed event. This keeps verification tied to people who have
 * watched others ride, rather than any logged-in member.
 */
export async function verifyRiderSkillAction(
  targetRiderId: string,
  skillSlug: string,
  level: string,
): Promise<SkillFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { error: "Please log in.", success: null };
  }

  const verifier = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });
  if (!verifier) {
    return { error: "No rider profile found.", success: null };
  }

  if (verifier.id === targetRiderId) {
    return { error: "You can't verify your own skills.", success: null };
  }

  const ledRides = await prisma.eventOrganizer.count({
    where: { riderId: verifier.id, event: { status: "COMPLETED" } },
  });
  if (ledRides === 0) {
    return { error: "Only ride organizers can verify skills.", success: null };
  }

  if (!Object.values(SkillLevel).includes(level as SkillLevel)) {
    return { error: "Invalid skill level.", success: null };
  }

  const [skill, target] = await Promise.all([
    prisma.skillTrack.findUnique({ where: { slug: skillSlug }, select: { id: true, name: true } }),
    prisma.rider.findUnique({ where: { id: targetRiderId }, select: { id: true, handle: true } }),
  ]);

  if (!skill || !target) {
    return { error: "Rider or skill not found.", success: null };
  }

  const verified = { level: level as SkillLevel, verifiedByRiderId: verifier.id, verifiedAt: new Date() };

  await prisma.riderSkill.upsert({
    where: { riderId_skillId: { riderId: target.id, skillId: skill.id } },
    create: { riderId: target.id, skillId: skill.id, ...verified },
    update: verified,
  });

  await logActivity({
    riderId: target.id,
    type: "SKILL_VERIFIED",
    summary: `Your ${skill.name} skill was verified at ${level.toLowerCase()} level`,
    refId: skill.id,
  });

  // A mentor-level verification can earn the Mentor badge.
  await syncRiderProgression(target.id);

  revalidatePath(`/r/${target.handle}`);
  revalidatePath("/skills");

  return { error: null, success: `Verified @${target.handle} at ${level.toLowerCase()} level.` };
}
