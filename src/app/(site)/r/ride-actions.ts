"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type RideLogState = { error: string | null; success: boolean };

/**
 * Log a ride taken outside a hosted event (solo/casual). Adds to the rider's
 * displayed lifetime rides/miles and drops a COMPLETED_RIDE into their feed —
 * but never touches the trust score, which stays built on event check-ins.
 */
export async function logRideAction(_prev: RideLogState, formData: FormData): Promise<RideLogState> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in.", success: false };
  }

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true, handle: true, name: true } });
  if (!rider) return { error: "Rider profile not found.", success: false };

  const title = (formData.get("title")?.toString() ?? "").trim().slice(0, 120) || null;
  const notes = (formData.get("notes")?.toString() ?? "").trim().slice(0, 1000) || null;
  const miles = Number.parseInt(formData.get("distanceMiles")?.toString() ?? "", 10);
  const dateInput = (formData.get("riddenAt")?.toString() ?? "").trim();

  if (!Number.isFinite(miles) || miles < 1 || miles > 100000) {
    return { error: "Enter a distance between 1 and 100,000 miles.", success: false };
  }

  // Interpret the date-only input as local noon so it lands on the intended day
  // regardless of zone. No date → today.
  const riddenAt = dateInput ? new Date(`${dateInput}T12:00:00`) : new Date();
  if (Number.isNaN(riddenAt.getTime())) {
    return { error: "Enter a valid date.", success: false };
  }

  await prisma.rideLog.create({
    data: { riderId: rider.id, title, distanceMiles: miles, riddenAt, notes },
  });

  await logActivity({
    riderId: rider.id,
    type: "COMPLETED_RIDE",
    summary: title ? `Logged a ${miles}-mile ride: ${title}` : `Logged a ${miles}-mile ride`,
  });

  revalidatePath(`/r/${rider.handle}`);
  return { error: null, success: true };
}

/** Remove one of the current rider's logged rides. */
export async function deleteRideLogAction(rideLogId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true, handle: true } });
  if (!rider) return;

  await prisma.rideLog.deleteMany({ where: { id: rideLogId, riderId: rider.id } });
  revalidatePath(`/r/${rider.handle}`);
}
