import { absoluteUrl } from "@/lib/absolute-url";
import { DEFAULT_TIMEZONE, formatEventDate } from "@/lib/datetime";
import { weeklyRecapEmail } from "@/lib/email-templates";
import { inngest } from "@/lib/inngest/client";
import { sendEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Your week in riding" — a weekly recap email. Runs Monday 8am Central. Only
 * emails riders who confirmed their address, opted in, and actually have
 * something to report (a ride, a new badge, or an upcoming RSVP), so dormant
 * riders never get an empty recap.
 */
export const weeklyRecap = inngest.createFunction(
  {
    id: "weekly-recap",
    name: "Weekly ride recap email",
    triggers: [{ cron: "TZ=America/Chicago 0 8 * * MON" }],
  },
  async ({ step }) => {
    const recipients = await step.run("load-recipients", () =>
      prisma.rider.findMany({
        // Opt-outs are rows now, so "wants it" is the absence of one.
        where: {
          user: { emailVerified: { not: null } },
          notificationPrefs: { none: { category: "weeklyRecap", channel: "email" } },
        },
        select: { id: true, name: true, handle: true, user: { select: { email: true } } },
      }),
    );

    let sent = 0;
    for (const rider of recipients) {
      const delivered = await step.run(`recap-${rider.id}`, async () => {
        const since = new Date(Date.now() - WEEK_MS);
        const soon = new Date(Date.now() + WEEK_MS);

        const [logAgg, checkIns, badges, rsvps] = await Promise.all([
          prisma.rideLog.aggregate({
            where: { riderId: rider.id, riddenAt: { gte: since } },
            _count: { _all: true },
            _sum: { distanceMiles: true },
          }),
          prisma.eventCheckIn.findMany({
            where: { riderId: rider.id, checkInAt: { gte: since } },
            select: { event: { select: { distanceMiles: true } } },
          }),
          prisma.riderBadge.findMany({
            where: { riderId: rider.id, awardedAt: { gte: since } },
            select: { badge: { select: { name: true } } },
          }),
          prisma.rsvp.findMany({
            where: { riderId: rider.id, status: "GOING", event: { startsAt: { gte: new Date(), lte: soon } } },
            orderBy: { event: { startsAt: "asc" } },
            take: 5,
            select: { event: { select: { title: true, startsAt: true, timezone: true } } },
          }),
        ]);

        const rides = logAgg._count._all + checkIns.length;
        const miles =
          (logAgg._sum.distanceMiles ?? 0) + checkIns.reduce((s, c) => s + (c.event.distanceMiles ?? 0), 0);
        const badgeNames = badges.map((b) => b.badge.name);
        const upcoming = rsvps.map((r) => ({
          title: r.event.title,
          when: formatEventDate(r.event.startsAt, r.event.timezone ?? DEFAULT_TIMEZONE),
        }));

        // Nothing worth an email.
        if (rides === 0 && badgeNames.length === 0 && upcoming.length === 0) return false;
        const to = rider.user?.email;
        if (!to) return false;

        const msg = weeklyRecapEmail(
          rider.name,
          { rides, miles, badges: badgeNames, upcoming },
          absoluteUrl(`/r/${rider.handle}`),
        );
        await sendEmail({ to, subject: msg.subject, html: msg.html });
        return true;
      });
      if (delivered) sent += 1;
    }

    return { recipients: recipients.length, sent };
  },
);
