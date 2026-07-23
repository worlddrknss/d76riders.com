import { AdminEventsTable, type AdminEventRow } from "@/components/admin/admin-events-table";
import { formatEventDate, formatEventTime } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export default async function AdminEventsPage() {
  const events = await prisma.rideEvent.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      featured: true,
      startsAt: true,
      timezone: true,
      meetLocation: true,
      endLocation: true,
      host: { select: { name: true, handle: true } },
      rsvps: { select: { status: true } },
    },
  });

  const now = new Date();

  const rows: AdminEventRow[] = events.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    status: event.status,
    featured: event.featured,
    // Formatted server-side in the ride's own zone. The browser's zone is not
    // the ride's, and a console that shows a 7pm ride as 8pm is worse than
    // useless when you are deciding whether to cancel it.
    whenLabel: `${formatEventDate(event.startsAt, event.timezone)} · ${formatEventTime(event.startsAt, event.timezone)}`,
    startsAtIso: event.startsAt.toISOString(),
    isPast: event.startsAt < now,
    hostName: event.host?.name ?? "Unknown",
    hostHandle: event.host?.handle ?? null,
    goingCount: event.rsvps.filter((r) => r.status === "GOING").length,
    interestedCount: event.rsvps.filter((r) => r.status === "INTERESTED").length,
    location: event.meetLocation || event.endLocation || "",
  }));

  const upcoming = rows.filter((r) => !r.isPast && r.status === "UPCOMING").length;
  const cancelled = rows.filter((r) => r.status === "CANCELLED").length;
  const featured = rows.filter((r) => r.featured).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Community</p>
        <h1 className="mt-2 font-display text-3xl text-white">Events</h1>
        <p className="mt-2 text-sm text-slate-300">
          Every ride on the calendar. Feature one on the homepage, or step in on a ride whose organizer has
          gone quiet — cancelling and reopening notify everyone tracking it, exactly as the host&apos;s own
          page does.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Upcoming" value={upcoming} />
        <Stat label="Featured" value={featured} />
        <Stat label="Cancelled" value={cancelled} tone={cancelled > 0 ? "warn" : "neutral"} />
      </div>

      <AdminEventsTable events={rows} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone === "warn" ? "text-amber-200" : "text-white"}`}>{value}</p>
    </div>
  );
}
