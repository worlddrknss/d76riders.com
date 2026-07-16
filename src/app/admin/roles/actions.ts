"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function grantRoleAction(formData: FormData): Promise<{ error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };
  await requireUserRole(currentUser.id, "ADMINISTRATOR");

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!userId || !role) return { error: "Missing user or role" };

  const validRoles = ["USER", "MODERATOR", "CONTRIBUTOR", "SPONSOR", "ADMINISTRATOR"];
  if (!validRoles.includes(role)) return { error: "Invalid role" };

  const existing = await prisma.userRole.findFirst({
    where: { userId, role: role as never },
  });

  if (existing) return { error: "User already has this role" };

  const created = await prisma.userRole.create({
    data: { userId, role: role as never },
  });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  await logAudit({
    actorUserId: currentUser.id,
    action: "role.grant",
    entityType: "UserRole",
    entityId: created.id,
    summary: `Granted ${role} to ${target?.email ?? userId}`,
    after: { userId, role },
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return {};
}

export async function revokeRoleAction(formData: FormData): Promise<{ error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };
  await requireUserRole(currentUser.id, "ADMINISTRATOR");

  const userRoleId = formData.get("userRoleId") as string;
  if (!userRoleId) return { error: "Missing role assignment ID" };

  // Prevent removing your own admin role
  const roleRecord = await prisma.userRole.findUnique({ where: { id: userRoleId } });
  if (!roleRecord) return { error: "Role assignment not found" };

  if (roleRecord.userId === currentUser.id && roleRecord.role === "ADMINISTRATOR") {
    return { error: "Cannot remove your own administrator role" };
  }

  await prisma.userRole.delete({ where: { id: userRoleId } });

  const target = await prisma.user.findUnique({
    where: { id: roleRecord.userId },
    select: { email: true },
  });

  await logAudit({
    actorUserId: currentUser.id,
    action: "role.revoke",
    entityType: "UserRole",
    entityId: userRoleId,
    summary: `Revoked ${roleRecord.role} from ${target?.email ?? roleRecord.userId}`,
    before: { userId: roleRecord.userId, role: roleRecord.role },
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return {};
}
