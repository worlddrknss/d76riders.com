import { buildCalendar, type CalendarEvent } from "@/lib/ics";
import { prisma } from "@/lib/prisma";

// A single ride as a downloadable .ics — the "Add to calendar" button on the
// event page points here. Public: adding a public event to your own calendar
// needs no account.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

const SELECT = {
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
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.rideEvent.findUnique({ where: { slug }, select: SELECT });

  // Draft events aren't public; don't leak them through the calendar door.
  if (!event || event.status === "DRAFT") {
    return new Response("Not found", { status: 404 });
  }

  const ics = buildCalendar([event as CalendarEvent], { baseUrl: SITE_URL });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
