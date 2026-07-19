import { prisma } from "@/lib/prisma";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEASONS = ["Winter", "Spring", "Summer", "Fall"];

function argmax(counts: number[]): number {
  let best = 0;
  for (let i = 1; i < counts.length; i += 1) if (counts[i] > counts[best]) best = i;
  return best;
}

function hourLabel(h: number): string {
  return `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * "Best time to ride" as a community pattern — the most common day, season, and
 * start hour across all scheduled rides (interpreted in each ride's timezone).
 * Routes are 1:1 with events, so there isn't per-road history; this is the
 * honest, data-grounded signal. Returns null until there's enough to be useful.
 */
export async function communityRideWindow(): Promise<{ day: string; season: string; timeLabel: string } | null> {
  const events = await prisma.rideEvent.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { startsAt: true, timezone: true },
    take: 500,
  });
  if (events.length < 4) return null;

  const dayCount = new Array(7).fill(0);
  const hourCount = new Array(24).fill(0);
  const seasonCount = new Array(4).fill(0);

  for (const e of events) {
    const tz = e.timezone || "America/Chicago";
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(e.startsAt);
    const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(e.startsAt), 10) % 24;
    const month = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "numeric" }).format(e.startsAt), 10);

    const dayIdx = DAYS.indexOf(weekday);
    if (dayIdx >= 0) dayCount[dayIdx] += 1;
    if (Number.isFinite(hour)) hourCount[hour] += 1;
    const season = month === 12 || month <= 2 ? 0 : month <= 5 ? 1 : month <= 8 ? 2 : 3;
    seasonCount[season] += 1;
  }

  return {
    day: DAYS[argmax(dayCount)],
    season: SEASONS[argmax(seasonCount)],
    timeLabel: hourLabel(argmax(hourCount)),
  };
}
