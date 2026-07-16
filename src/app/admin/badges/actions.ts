"use server";

import { BadgeCriteria, BadgeTier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { syncRiderProgression } from "@/lib/reputation";
import { getCurrentUser } from "@/lib/session";

async function requireAdminUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    redirect("/admin");
  }
  try {
    await requireUserRole(currentUser.id, "ADMINISTRATOR");
  } catch {
    redirect("/admin");
  }
  return currentUser.id;
}

function text(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

export async function createBadgeAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const name = text(formData.get("name"));
  const slug = text(formData.get("slug")) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const criteria = text(formData.get("criteria"));
  const tier = text(formData.get("tier"));

  if (!name || !slug) {
    redirect("/admin/badges?error=missing");
  }

  if (await prisma.badge.findUnique({ where: { slug }, select: { id: true } })) {
    redirect("/admin/badges?error=slug");
  }

  const threshold = Number.parseInt(text(formData.get("threshold")), 10);

  const badge = await prisma.badge.create({
    data: {
      slug,
      name,
      description: text(formData.get("description")) || name,
      icon: text(formData.get("icon")) || "award",
      tier: Object.values(BadgeTier).includes(tier as BadgeTier) ? (tier as BadgeTier) : "BRONZE",
      criteria: Object.values(BadgeCriteria).includes(criteria as BadgeCriteria)
        ? (criteria as BadgeCriteria)
        : "MANUAL",
      threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 1,
    },
  });

  await logAudit({
    actorUserId: userId,
    action: "badge.create",
    entityType: "Badge",
    entityId: badge.id,
    summary: `Created badge "${badge.name}"`,
    after: { slug: badge.slug, criteria: badge.criteria, threshold: badge.threshold },
  });

  revalidatePath("/admin/badges");
  redirect("/admin/badges");
}

export async function deleteBadgeAction(badgeId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
    select: { id: true, name: true, slug: true },
  });
  if (!badge) {
    revalidatePath("/admin/badges");
    return;
  }

  await prisma.badge.delete({ where: { id: badgeId } });

  await logAudit({
    actorUserId: userId,
    action: "badge.delete",
    entityType: "Badge",
    entityId: badgeId,
    summary: `Deleted badge "${badge.name}" and revoked it from every rider`,
    before: badge,
  });

  revalidatePath("/admin/badges");
}

// Hand-award a badge. This is the only path for MANUAL badges, and it also lets
// an admin grant an automatic badge early.
export async function awardBadgeAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const badgeId = text(formData.get("badgeId"));
  const handle = text(formData.get("handle"));

  const [badge, rider] = await Promise.all([
    prisma.badge.findUnique({ where: { id: badgeId }, select: { id: true, name: true } }),
    prisma.rider.findUnique({ where: { handle }, select: { id: true, handle: true } }),
  ]);

  if (!badge || !rider) {
    redirect("/admin/badges?error=award");
  }

  const existing = await prisma.riderBadge.findUnique({
    where: { riderId_badgeId: { riderId: rider.id, badgeId: badge.id } },
    select: { id: true },
  });

  if (existing) {
    redirect("/admin/badges?error=duplicate");
  }

  await prisma.riderBadge.create({
    data: { riderId: rider.id, badgeId: badge.id, awardedByUserId: userId },
  });

  await logActivity({
    riderId: rider.id,
    type: "BADGE_EARNED",
    summary: `You were awarded the ${badge.name} badge`,
    refId: badge.id,
  });

  await logAudit({
    actorUserId: userId,
    action: "badge.award",
    entityType: "RiderBadge",
    entityId: badge.id,
    summary: `Awarded "${badge.name}" to @${rider.handle}`,
    after: { riderId: rider.id, badgeId: badge.id },
  });

  revalidatePath("/admin/badges");
  revalidatePath(`/r/${rider.handle}`);
}

// Recompute every rider's trust snapshot. Needed after changing scoring rules or
// backfilling history, since trust is only refreshed on ride events.
export async function recomputeAllTrustAction(): Promise<void> {
  const userId = await requireAdminUserId();

  const riders = await prisma.rider.findMany({ select: { id: true } });

  for (const rider of riders) {
    await syncRiderProgression(rider.id);
  }

  await logAudit({
    actorUserId: userId,
    action: "trust.recompute",
    entityType: "RiderTrust",
    summary: `Recomputed trust and badges for ${riders.length} rider${riders.length === 1 ? "" : "s"}`,
  });

  revalidatePath("/admin/badges");
  revalidatePath("/leaderboard");
}
