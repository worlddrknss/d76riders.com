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
