"use server";

import { revalidatePath } from "next/cache";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * User moderation.
 *
 * The console could grant and revoke roles and nothing else — no way to end a
 * session, confirm an address, or stop an abusive account short of deleting
 * them outright. Every action here is audited, because "who did this and when"
 * is the first question asked about any of them.
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

/** An administrator must not be able to lock themselves out of the console. */
async function assertNotSelf(actorId: string, targetId: string, verb: string): Promise<void> {
  if (actorId === targetId) {
    throw new Error(`You cannot ${verb} your own account.`);
  }
}

export async function suspendUserAction(userId: string, reason: string): Promise<void> {
  const actorId = await requireAdmin();
  await assertNotSelf(actorId, userId, "suspend");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, suspendedAt: true, roles: { select: { role: true } } },
  });
  if (!target) throw new Error("User not found.");

  // Suspending an administrator would need another administrator to undo, and
  // is far more often a misclick than an intention.
  if (target.roles.some((r) => r.role === "ADMINISTRATOR")) {
    throw new Error("Remove the administrator role before suspending this account.");
  }

  const trimmed = reason.trim();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: trimmed || null,
        suspendedById: actorId,
      },
    });
    // Suspension has to take effect now, not whenever their cookie expires.
    await tx.session.deleteMany({ where: { userId } });
  });

  await logAudit({
    actorUserId: actorId,
    action: "user.suspend",
    entityType: "User",
    entityId: userId,
    summary: `Suspended ${target.email}${trimmed ? `: ${trimmed}` : ""}`,
    before: { suspendedAt: target.suspendedAt },
    after: { suspendedAt: new Date(), suspendedReason: trimmed || null },
  });

  revalidatePath("/admin/users");
}

export async function unsuspendUserAction(userId: string): Promise<void> {
  const actorId = await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, suspendedAt: true, suspendedReason: true },
  });
  if (!target) throw new Error("User not found.");

  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: null, suspendedReason: null, suspendedById: null },
  });

  await logAudit({
    actorUserId: actorId,
    action: "user.unsuspend",
    entityType: "User",
    entityId: userId,
    summary: `Lifted the suspension on ${target.email}`,
    before: { suspendedAt: target.suspendedAt, suspendedReason: target.suspendedReason },
    after: { suspendedAt: null },
  });

  revalidatePath("/admin/users");
}

/** Sign an account out everywhere — the lightest lever, for a shared password. */
export async function forceLogoutUserAction(userId: string): Promise<void> {
  const actorId = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target) throw new Error("User not found.");

  const { count } = await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    actorUserId: actorId,
    action: "user.force_logout",
    entityType: "User",
    entityId: userId,
    summary: `Ended ${count} session${count === 1 ? "" : "s"} for ${target.email}`,
  });

  revalidatePath("/admin/users");
}

/**
 * Confirm an address by hand.
 *
 * Verification mail does get lost, and until now the only fix was asking the
 * rider to keep retrying. Marking it verified is the same state the link would
 * have produced.
 */
export async function verifyUserEmailAction(userId: string): Promise<void> {
  const actorId = await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });
  if (!target) throw new Error("User not found.");
  if (target.emailVerified) return;

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });

  await logAudit({
    actorUserId: actorId,
    action: "user.verify_email",
    entityType: "User",
    entityId: userId,
    summary: `Manually verified ${target.email}`,
    after: { emailVerified: new Date() },
  });

  revalidatePath("/admin/users");
}

/**
 * Delete an account and everything cascading from it.
 *
 * Irreversible, and it takes their events, articles and journal with it — which
 * is exactly why suspension exists. This stays for the genuine erasure request.
 */
export async function deleteUserAction(userId: string): Promise<void> {
  const actorId = await requireAdmin();
  await assertNotSelf(actorId, userId, "delete");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, roles: { select: { role: true } } },
  });
  if (!target) throw new Error("User not found.");

  if (target.roles.some((r) => r.role === "ADMINISTRATOR")) {
    throw new Error("Remove the administrator role before deleting this account.");
  }

  // Logged before the delete: afterwards there is no row left to describe, and
  // the audit trail is the only remaining record that the account existed.
  await logAudit({
    actorUserId: actorId,
    action: "user.delete",
    entityType: "User",
    entityId: userId,
    summary: `Deleted the account ${target.email}`,
    before: { email: target.email, name: target.name },
  });

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
}
