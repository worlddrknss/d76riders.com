import { randomBytes } from "node:crypto";

import { absoluteUrl } from "@/lib/absolute-url";
import { passwordResetEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mailer";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

// Short window — a reset link is high-value, so it expires fast and is single-use.
const TOKEN_TTL_MINUTES = 60;

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function expiryFromNow(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + TOKEN_TTL_MINUTES);
  return d;
}

/**
 * Issue a reset token for the account at `email` and send the reset link.
 * Silently no-ops when no account matches, so the caller can always report the
 * same "if an account exists, we sent a link" message (no account enumeration).
 * Never throws — email failures are logged and swallowed.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!user) return;

  const token = newToken();
  try {
    await prisma.$transaction([
      // Only the newest link works — invalidate any outstanding ones.
      prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
      prisma.passwordReset.create({ data: { userId: user.id, token, expires: expiryFromNow() } }),
    ]);

    const resetUrl = absoluteUrl(`/reset-password/${token}`);
    const message = passwordResetEmail(user.name ?? "rider", resetUrl);
    await sendEmail({ to: user.email, subject: message.subject, html: message.html });
  } catch (err) {
    console.error("[password-reset] failed to issue/send reset", err);
  }
}

export type ResetResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" };

/**
 * Validate a reset token and set the account's new password. Single-use — all of
 * the user's reset tokens are cleared on success, and (defence in depth) their
 * active sessions are revoked so a leaked-then-reset password can't be reused.
 */
export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const record = await prisma.passwordReset.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: "invalid" };

  if (record.expires < new Date()) {
    await prisma.passwordReset.delete({ where: { token } }).catch(() => {});
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.deleteMany({ where: { userId: record.userId } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return { ok: true, userId: record.userId };
}
