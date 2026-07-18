"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Admin-only: grant or remove a rider's Ambassador status. */
export async function toggleAmbassadorAction(handle: string, makeAmbassador: boolean): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = await requireUserRole(currentUser?.id, "ADMINISTRATOR");

  const rider = await prisma.rider.findUnique({ where: { handle }, select: { id: true, handle: true } });
  if (!rider) return;

  await prisma.rider.update({ where: { id: rider.id }, data: { isAmbassador: makeAmbassador } });

  await logAudit({
    actorUserId: userId,
    action: makeAmbassador ? "ambassador.grant" : "ambassador.revoke",
    entityType: "Rider",
    entityId: rider.id,
    summary: `${makeAmbassador ? "Granted" : "Removed"} Ambassador for @${rider.handle}`,
    after: { riderId: rider.id, isAmbassador: makeAmbassador },
  });

  revalidatePath(`/r/${rider.handle}`);
  revalidatePath("/ambassadors");
  revalidatePath("/admin/community/ambassadors");
}

/** Admin-only: grant Ambassador to a rider by handle (from the admin list form). */
export async function grantAmbassadorByHandleAction(formData: FormData): Promise<void> {
  const raw = (formData.get("handle")?.toString() ?? "").trim().replace(/^@/, "");
  if (!raw) return;
  await toggleAmbassadorAction(raw, true);
}
