import { formatEventDate, formatEventTime, toZonedInputValue } from "@/lib/datetime";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { sendPushToRider } from "@/lib/push";
import { getDailyForecast, weatherLabel, withinForecastWindow } from "@/lib/weather";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Push a "your ride is coming up" reminder ~24h out to everyone who RSVP'd, with
 * the ride-day forecast when we can get one. Runs hourly; each event fires once
 * (stamped via reminderSentAt) the first time it enters the 24-hour window.
 */
export const eventReminders = inngest.createFunction(
  {
    id: "event-reminders",
    name: "Push ride reminders ~24h out",
    triggers: [{ cron: "5 * * * *" }],
  },
  async ({ step }) => {
    const pushed = await step.run("send-reminders", async () => {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + DAY_MS);

      const events = await prisma.rideEvent.findMany({
        where: {
          status: "UPCOMING",
          reminderSentAt: null,
          startsAt: { gt: now, lte: windowEnd },
        },
        take: 200,
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          timezone: true,
          meetLat: true,
          meetLng: true,
          rsvps: {
            where: { status: { in: ["GOING", "WAITLISTED", "INTERESTED"] } },
            select: { riderId: true },
          },
        },
      });
      if (events.length === 0) return 0;

      let count = 0;
      for (const ev of events) {
        // Optional ride-day forecast for the push body.
        let weather = "";
        const dateStr = toZonedInputValue(ev.startsAt, ev.timezone).slice(0, 10);
        if (ev.meetLat != null && ev.meetLng != null && withinForecastWindow(dateStr, now)) {
          const forecast = await getDailyForecast(ev.meetLat, ev.meetLng, dateStr);
          if (forecast) {
            weather = ` · ${forecast.highF}°/${forecast.lowF}° ${weatherLabel(forecast.code)}, ${forecast.precipChance}% rain`;
          }
        }

        const body = `Meet ${formatEventTime(ev.startsAt, ev.timezone)}, ${formatEventDate(ev.startsAt, ev.timezone)}.${weather}`;
        for (const { riderId } of ev.rsvps) {
          await sendPushToRider(riderId, {
            title: `Reminder: ${ev.title}`,
            body,
            url: `/events/${ev.slug}`,
            tag: `event-reminder-${ev.id}`,
          });
        }
        count += ev.rsvps.length;
      }

      await prisma.rideEvent.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: { reminderSentAt: new Date() },
      });

      return count;
    });

    return { pushed };
  },
);
