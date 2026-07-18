"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Monday (UTC-midnight) of the current Central week — matches the cron's key. */
function currentWeekStart(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const daysSinceMonday = (dt.getUTCDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  dt.setUTCDate(dt.getUTCDate() - daysSinceMonday);
  return dt;
}

/** Admin-only: set (or replace) this week's Rider Spotlight. */
export async function setSpotlightAction(handle: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = await requireUserRole(currentUser?.id, "ADMINISTRATOR");

  const rider = await prisma.rider.findUnique({ where: { handle }, select: { id: true, handle: true } });
  if (!rider) return;

  const weekStart = currentWeekStart();
  await prisma.spotlight.upsert({
    where: { weekStart },
    create: { riderId: rider.id, weekStart },
    update: { riderId: rider.id },
  });

  await logAudit({
    actorUserId: userId,
    action: "spotlight.set",
    entityType: "Spotlight",
    entityId: rider.id,
    summary: `Set Rider Spotlight to @${rider.handle}`,
    after: { riderId: rider.id, weekStart: weekStart.toISOString() },
  });

  revalidatePath("/");
  revalidatePath(`/r/${rider.handle}`);
}
