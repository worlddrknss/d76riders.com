import { startOfTodayUtc } from "@/lib/datetime";
import { buildCalendar, type CalendarEvent } from "@/lib/ics";
import { prisma } from "@/lib/prisma";

// A rider's personal, subscribable feed: the upcoming rides they've committed to
// (GOING or WAITLISTED). A calendar app fetches this without cookies, so the
// unguessable token in the URL is the auth. Rotating the token (from /account)
// revokes every existing subscription.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rider = await prisma.rider.findUnique({
    where: { calendarToken: token },
    select: { name: true, timezone: true },
  });
  if (!rider) {
    return new Response("Not found", { status: 404 });
  }

  // Upcoming (today or later, in the rider's zone) rides they're committed to.
  const rsvps = await prisma.rsvp.findMany({
    where: {
      rider: { calendarToken: token },
      status: { in: ["GOING", "WAITLISTED"] },
      event: { status: "UPCOMING", startsAt: { gte: startOfTodayUtc(rider.timezone) } },
    },
    orderBy: { event: { startsAt: "asc" } },
    select: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          description: true,
          startsAt: true,
          status: true,
          meetLocation: true,
          meetAddress: true,
          meetLat: true,
          meetLng: true,
          updatedAt: true,
        },
      },
    },
  });

  const events = rsvps.map((r) => r.event as CalendarEvent);
  const ics = buildCalendar(events, {
    baseUrl: SITE_URL,
    name: `${rider.name} — District 76 Rides`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="d76-rides.ics"',
      // Short cache: subscriptions poll on their own schedule, and an RSVP change
      // should show up soon.
      "Cache-Control": "private, max-age=300",
    },
  });
}
