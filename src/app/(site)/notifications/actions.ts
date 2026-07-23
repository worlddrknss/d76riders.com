"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function markAllReadAction(): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!rider) return;

  await prisma.activity.updateMany({
    where: { riderId: rider.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
}

/**
 * Mark one notification read, on click.
 *
 * Scoped to the caller's own rider id: an activity id from someone else's inbox
 * must not be markable just by knowing it.
 */
export async function markActivityReadAction(activityId: string): Promise<void> {
  if (typeof activityId !== "string" || !activityId) return;

  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return;

  await prisma.activity.updateMany({
    where: { id: activityId, riderId: rider.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
}
