"use server";

import { sendVerification } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ResendState = { sent: boolean; error: string | null };

/** Re-issue and resend the verification email to the signed-in user's address. */
export async function resendVerificationAction(): Promise<ResendState> {
  const user = await getCurrentUser();
  if (!user) return { sent: false, error: "Please log in first." };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true, name: true, rider: { select: { name: true } } },
  });
  if (!record) return { sent: false, error: "Account not found." };
  if (record.emailVerified) return { sent: false, error: "Your email is already confirmed." };

  await sendVerification(user.id, record.email, record.rider?.name ?? record.name ?? "rider");
  return { sent: true, error: null };
}
