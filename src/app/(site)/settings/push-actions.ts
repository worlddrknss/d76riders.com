"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function currentRiderId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  return rider?.id ?? null;
}

export async function savePushSubscriptionAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      riderId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent ?? null,
    },
    update: { riderId, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent ?? null },
  });
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, riderId } });
}

/** Set quiet hours (0-23, Central) or clear them by passing null for both. */
export async function updateQuietHoursAction(start: number | null, end: number | null): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;

  const clamp = (v: number | null) => (v == null || v < 0 || v > 23 ? null : Math.floor(v));
  const s = clamp(start);
  const e = clamp(end);

  await prisma.rider.update({
    where: { id: riderId },
    data: { quietHoursStart: s, quietHoursEnd: e },
  });
  revalidatePath("/settings");
}
