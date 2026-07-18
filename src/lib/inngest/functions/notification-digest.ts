import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { centralHour, sendPushToRider } from "@/lib/push";

/** Length of a quiet-hours window in hours (handles the midnight wrap). */
function windowLength(start: number, end: number): number {
  return start < end ? end - start : 24 - start + end;
}

/**
 * Deliver the quiet-hours digest. Runs hourly; for every rider whose quiet-hours
 * window ends this hour, push a single summary of the notifications that piled up
 * while pushes were held. Fires once per day per rider (at their window end).
 */
export const notificationDigest = inngest.createFunction(
  {
    id: "notification-digest",
    name: "Deliver quiet-hours notification digest",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const sent = await step.run("send-digests", async () => {
      const hour = centralHour();
      const riders = await prisma.rider.findMany({
        where: { quietHoursEnd: hour, quietHoursStart: { not: null } },
        select: { id: true, quietHoursStart: true, quietHoursEnd: true },
      });

      let count = 0;
      for (const r of riders) {
        const len = windowLength(r.quietHoursStart!, r.quietHoursEnd!);
        const since = new Date(Date.now() - len * 3_600_000);
        const unread = await prisma.activity.count({
          where: { riderId: r.id, readAt: null, createdAt: { gte: since } },
        });
        if (unread > 0) {
          await sendPushToRider(r.id, {
            title: "While you were away",
            body: `${unread} new ${unread === 1 ? "notification" : "notifications"} on District 76`,
            url: "/notifications",
            tag: "d76-digest",
          });
          count += 1;
        }
      }
      return count;
    });

    return { digestsSent: sent };
  },
);
