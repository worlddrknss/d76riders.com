import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { absoluteUrl } from "@/lib/absolute-url";
import { welcomeVerifyEmail, verifyEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_HOURS = 24;

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function expiryFromNow(): Date {
  const d = new Date();
  d.setHours(d.getHours() + TOKEN_TTL_HOURS);
  return d;
}

type SendVerificationOptions = {
  /** true when verifying a pending NEW address (email change) vs the current one. */
  isChange?: boolean;
  /** true to send the welcome+verify email (first signup) instead of plain verify. */
  welcome?: boolean;
};

/**
 * Issue a fresh verification token for `email` and send the confirmation email.
 * Replaces any outstanding tokens for the user (only the newest link works).
 * Never throws — email failures are logged and swallowed so they can't break the
 * surrounding action (registration, account edit).
 */
export async function sendVerification(
  userId: string,
  email: string,
  name: string,
  options: SendVerificationOptions = {},
): Promise<void> {
  const token = newToken();
  try {
    await prisma.$transaction([
      prisma.emailVerification.deleteMany({ where: { userId } }),
      prisma.emailVerification.create({
        data: { userId, email, token, expires: expiryFromNow() },
      }),
    ]);

    const verifyUrl = absoluteUrl(`/verify-email/${token}`);
    const message = options.welcome
      ? welcomeVerifyEmail(name, verifyUrl)
      : verifyEmail(name, verifyUrl, Boolean(options.isChange));

    await sendEmail({ to: email, subject: message.subject, html: message.html });
  } catch (err) {
    console.error("[verify] failed to issue/send verification", err);
  }
}

export type ConsumeResult =
  | { ok: true; alreadyVerified?: boolean }
  | { ok: false; reason: "invalid" | "expired" | "email_taken" };

/**
 * Validate a verification token and apply it: set the user's email to the
 * token's address (covers email changes) and stamp emailVerified. Single-use —
 * all of the user's tokens are cleared on success.
 */
export async function consumeVerification(token: string): Promise<ConsumeResult> {
  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: "invalid" };

  if (record.expires < new Date()) {
    await prisma.emailVerification.delete({ where: { token } }).catch(() => {});
    return { ok: false, reason: "expired" };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { email: record.email, emailVerified: new Date() },
      }),
      prisma.emailVerification.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { ok: true };
  } catch (err) {
    // Someone else claimed this address between request and click.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "email_taken" };
    }
    throw err;
  }
}
