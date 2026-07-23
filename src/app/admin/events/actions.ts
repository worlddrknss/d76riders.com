"use server";

import { revalidatePath } from "next/cache";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Bulk levers for the events console.
 *
 * Cancelling and deleting deliberately are NOT here — those live with the
 * public host actions, which admins now share, because they carry the
 * notification work. The people tracking a ride must be told the same way
 * whether the host or a moderator ended it, and duplicating that here would
 * guarantee the two copies drift.
 */
async function requireAdmin(): Promise<string> {
  const currentUser = await getCurrentUser();
  try {
    await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw new Error("Administrator access required.");
    }
    throw error;
  }
  return currentUser!.id;
}

export async function bulkSetEventFeaturedAction(eventIds: string[], featured: boolean): Promise<void> {
  const actorId = await requireAdmin();
  if (eventIds.length === 0) return;

  const { count } = await prisma.rideEvent.updateMany({
    where: { id: { in: eventIds } },
    data: { featured },
  });

  await logAudit({
    actorUserId: actorId,
    action: "event.feature",
    entityType: "RideEvent",
    summary: `${featured ? "Featured" : "Unfeatured"} ${count} ride${count === 1 ? "" : "s"} on the homepage`,
    after: { featured },
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}
