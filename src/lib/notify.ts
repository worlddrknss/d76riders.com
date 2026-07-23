import { sendEmail } from "@/lib/mailer";
import {
  ridersOptedIn,
  type NotificationCategory,
  type NotificationChannel,
} from "@/lib/notification-prefs";
import { prisma } from "@/lib/prisma";
import { sendPushToRider, type PushPayload } from "@/lib/push";

type BuiltEmail = { subject: string; html: string };

/**
 * Email a set of riders, honouring each rider's per-channel routing for the
 * category. `build` receives the recipient's display name so the message can be
 * personalised. Fire-and-forget: failures are logged, never thrown — a
 * notification must never break the action that triggered it.
 *
 * Delivery ignores email-verification status (the address was self-provided);
 * routing is the only gate.
 */
export async function emailNotifyRiders(
  riderIds: string[],
  category: NotificationCategory,
  build: (recipientName: string) => BuiltEmail,
  options?: {
    /**
     * Send regardless of routing. Reserved for safety alerts — a rider-down
     * report reaching organizers is not a notification preference.
     */
    force?: boolean;
  },
): Promise<void> {
  const unique = [...new Set(riderIds)].filter(Boolean);
  if (unique.length === 0) return;

  try {
    const wanted = options?.force ? unique : await ridersOptedIn(unique, category, "email");
    if (wanted.length === 0) return;

    const riders = await prisma.rider.findMany({
      where: { id: { in: wanted } },
      select: { name: true, user: { select: { email: true } } },
    });

    await Promise.all(
      riders.map(async (rider) => {
        const to = rider.user?.email;
        if (!to) return;
        const message = build(rider.name);
        const result = await sendEmail({ to, subject: message.subject, html: message.html });
        if (!result.ok && !result.skipped) {
          console.error(`[notify] ${category} email to ${to} failed`);
        }
      }),
    );
  } catch (err) {
    console.error(`[notify] ${category} notification failed`, err);
  }
}

/**
 * Push a set of riders, honouring their routing for the category.
 *
 * Senders used to call sendPushToRider directly, which meant push ignored
 * preferences entirely — there was nowhere to express one. Route through here
 * so a rider who switches a category off on push actually stops getting it.
 */
export async function pushNotifyRidersByCategory(
  riderIds: string[],
  category: NotificationCategory,
  payload: PushPayload,
  options?: { force?: boolean },
): Promise<void> {
  const unique = [...new Set(riderIds)].filter(Boolean);
  if (unique.length === 0) return;

  try {
    const wanted = options?.force ? unique : await ridersOptedIn(unique, category, "push");
    await Promise.all(wanted.map((riderId) => sendPushToRider(riderId, payload).catch(() => {})));
  } catch (err) {
    console.error(`[notify] ${category} push failed`, err);
  }
}

/** The riders who still want this category in their alerts inbox. */
export async function inAppRecipients(
  riderIds: string[],
  category: NotificationCategory,
): Promise<string[]> {
  return ridersOptedIn(riderIds, category, "inApp");
}

export type { NotificationCategory, NotificationChannel };
