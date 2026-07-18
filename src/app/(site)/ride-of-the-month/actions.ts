"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { periodForDate } from "@/lib/ride-of-month";
import { getCurrentUser } from "@/lib/session";

/**
 * Cast (or move, or clear) this rider's Ride-of-the-Month vote for the current
 * month. One vote per rider per month — voting again for the same ride clears
 * it; voting for a different one moves it.
 */
export async function voteRideOfMonthAction(eventId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!rider) return;

  const event = await prisma.rideEvent.findUnique({ where: { id: eventId }, select: { id: true, status: true } });
  if (!event || event.status !== "COMPLETED") return;

  const period = periodForDate();
  const existing = await prisma.rideOfMonthVote.findUnique({
    where: { riderId_period: { riderId: rider.id, period } },
    select: { id: true, eventId: true },
  });

  if (existing && existing.eventId === eventId) {
    // Toggle off — clicking your current pick again clears the vote.
    await prisma.rideOfMonthVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.rideOfMonthVote.update({ where: { id: existing.id }, data: { eventId } });
  } else {
    await prisma.rideOfMonthVote.create({ data: { riderId: rider.id, eventId, period } });
  }

  revalidatePath("/ride-of-the-month");
}
