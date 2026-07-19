import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { sendPushToRider } from "@/lib/push";

/**
 * Push due maintenance reminders every morning. When a rider logs a service they
 * can set "remind me again in N months"; this sweeps the records whose reminder
 * has come due (and hasn't fired yet), pushes the rider a summary, and stamps
 * remindedAt so each reminder fires exactly once.
 */
export const maintenanceReminders = inngest.createFunction(
  {
    id: "maintenance-reminders",
    name: "Push due maintenance reminders",
    triggers: [{ cron: "TZ=America/Chicago 0 8 * * *" }],
  },
  async ({ step }) => {
    const pushed = await step.run("send-due", async () => {
      const now = new Date();
      const select = {
        id: true,
        title: true,
        riderId: true,
        remindMileage: true,
        bike: { select: { name: true, currentMileage: true } },
        rider: { select: { handle: true } },
      } as const;

      // Date-due, plus mileage candidates filtered in JS (can't compare two
      // columns in a Prisma where).
      const [dateDue, mileageCandidates] = await Promise.all([
        prisma.serviceRecord.findMany({ where: { remindAt: { lte: now }, remindedAt: null }, take: 500, select }),
        prisma.serviceRecord.findMany({ where: { remindMileage: { not: null }, remindedAt: null }, take: 500, select }),
      ]);
      const mileageDue = mileageCandidates.filter(
        (r) => r.bike.currentMileage != null && r.remindMileage != null && r.bike.currentMileage >= r.remindMileage,
      );

      const dueMap = new Map<string, (typeof dateDue)[number]>();
      for (const r of [...dateDue, ...mileageDue]) dueMap.set(r.id, r);
      const due = [...dueMap.values()];
      if (due.length === 0) return 0;

      const byRider = new Map<string, { handle: string; items: { title: string; bike: string }[] }>();
      for (const r of due) {
        const entry = byRider.get(r.riderId) ?? { handle: r.rider.handle, items: [] };
        entry.items.push({ title: r.title, bike: r.bike.name });
        byRider.set(r.riderId, entry);
      }

      let count = 0;
      for (const [riderId, { handle, items }] of byRider) {
        const first = items[0];
        const body =
          items.length === 1
            ? `${first.title} on your ${first.bike} is due.`
            : `${items.length} maintenance items are due, starting with ${first.title} on your ${first.bike}.`;
        await sendPushToRider(riderId, {
          title: "Maintenance due",
          body,
          url: `/r/${handle}?tab=garage`,
          tag: "d76-maintenance",
        });
        count += 1;
      }

      await prisma.serviceRecord.updateMany({
        where: { id: { in: due.map((r) => r.id) } },
        data: { remindedAt: new Date() },
      });

      return count;
    });

    return { pushed };
  },
);
