import { sendEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

/** Which per-rider opt-out flag gates each notification category. */
type NotifyCategory = "mention" | "comment" | "rsvp" | "event";

const PREF_FIELD: Record<NotifyCategory, "emailOnMention" | "emailOnComment" | "emailOnRsvp" | "emailOnEventMessage"> = {
  mention: "emailOnMention",
  comment: "emailOnComment",
  rsvp: "emailOnRsvp",
  event: "emailOnEventMessage",
};

type BuiltEmail = { subject: string; html: string };

/**
 * Email a set of riders a notification, honoring each rider's category opt-out.
 * `build` receives the recipient's display name and returns the message, so the
 * subject/body can be personalized. Fire-and-forget: failures are logged, never
 * thrown — a notification must never break the action that triggered it.
 *
 * Delivery is best-effort regardless of email-verification status (the address
 * was self-provided); the per-category flag is the only gate.
 */
export async function emailNotifyRiders(
  riderIds: string[],
  category: NotifyCategory,
  build: (recipientName: string) => BuiltEmail,
): Promise<void> {
  const unique = [...new Set(riderIds)].filter(Boolean);
  if (unique.length === 0) return;

  const prefField = PREF_FIELD[category];
  try {
    const riders = await prisma.rider.findMany({
      where: { id: { in: unique }, [prefField]: true },
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
