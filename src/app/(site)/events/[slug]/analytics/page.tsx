import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getEventAnalytics, getOrganizerAnalytics } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// An organizer's turnout numbers are not public. Keep them out of search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function EventAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();

  const event = await prisma.rideEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      startsAt: true,
      host: { select: { userId: true } },
      organizers: { select: { rider: { select: { userId: true } } } },
    },
  });
  if (!event) notFound();

  // Access is the organizer's own: your userId must match the host or an
  // organizer of this ride. Anyone else gets a 404, not a "forbidden" — the
  // page shouldn't even admit it exists.
  const isOrganizer =
    !!currentUser &&
    (event.host.userId === currentUser.id ||
      event.organizers.some((o) => o.rider.userId === currentUser.id));
  if (!isOrganizer) notFound();

  const viewerRider = await prisma.rider.findUnique({
    where: { userId: currentUser!.id },
    select: { id: true },
  });
  if (!viewerRider) notFound();

  const [ride, mine] = await Promise.all([
    getEventAnalytics(event.id, event.startsAt),
    getOrganizerAnalytics(viewerRider.id),
  ]);

  const rideFunnel = [
    { label: "RSVP'd going", value: ride.going, color: "#3a6ea5" },
    { label: "Checked in", value: ride.attended, color: "#e8703a" },
    { label: "Rode out (checked out)", value: ride.checkedOut, color: "#3f8a4f" },
  ];
  const rideFunnelMax = Math.max(1, ride.going);

  const trend = mine.trend.slice(-12);
  const trendMax = Math.max(1, ...trend.map((e) => Math.max(e.going, e.attended)));

  const rideTiles = [
    { label: "RSVP'd going", value: String(ride.going) },
    { label: "Checked in", value: String(ride.attended) },
    { label: "Conversion", value: pct(ride.conversionRate) },
    { label: "No-shows", value: String(ride.noShows.length) },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
          <Link href="/events" className="text-muted transition hover:text-sunset">Events</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <Link href={`/events/${event.slug}`} className="text-muted transition hover:text-sunset">
            {event.title}
          </Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="text-asphalt">Analytics</span>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sunset">Organizer</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Ride analytics</h1>
          <p className="mt-1 text-sm text-muted">
            How {event.title} did, and how your rides are trending overall.
          </p>
        </div>

        {/* ── THIS RIDE ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-asphalt">This ride</h2>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rideTiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-border bg-surface p-4 shadow-soft">
                <p className="font-display text-3xl text-sunset">{t.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Funnel */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <h3 className="font-display text-base text-ink">Commitment to kickstands</h3>
              <div className="mt-4 space-y-3">
                {rideFunnel.map((step) => (
                  <div key={step.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{step.label}</span>
                      <span className="font-display text-ink">{step.value}</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(step.value / rideFunnelMax) * 100}%`, background: step.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                {`On time: ${ride.onTime} · Late: ${ride.late} (within 15 min of start counts as on time).`}
              </p>
            </div>

            {/* No-shows */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <h3 className="font-display text-base text-ink">
                Said going, didn&apos;t show
                <span className="ml-2 text-sm font-normal text-muted">{ride.noShows.length}</span>
              </h3>
              {ride.noShows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {ride.going === 0 ? "No GOING RSVPs on this ride yet." : "Everyone who said going showed up."}
                </p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {ride.noShows.map((r) => (
                    <li
                      key={r.handle ?? r.name}
                      className="rounded-full border border-border bg-canvas px-3 py-1 text-xs text-ink"
                    >
                      {r.handle ? `@${r.handle}` : r.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ── YOUR RIDES OVERALL ── */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-asphalt">
              Your rides overall
            </h2>
            <span className="text-xs text-muted">
              {mine.ridesHeld} {mine.ridesHeld === 1 ? "ride" : "rides"} · {pct(mine.conversionRate)} show up
            </span>
          </div>

          {/* Turnout trend */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base text-ink">Turnout by ride</h3>
                <p className="mt-1 text-xs text-muted">Who said they were going, and who actually rode.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm" style={{ background: "#3a6ea5" }} />
                  RSVP&apos;d
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm" style={{ background: "#e8703a" }} />
                  Attended
                </span>
              </div>
            </div>

            {trend.length === 0 ? (
              <p className="mt-5 text-sm text-muted">No past rides yet.</p>
            ) : (
              <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto pb-1">
                {trend.map((e) => (
                  <div key={e.slug} className="flex h-full min-w-10 flex-1 flex-col justify-end gap-1">
                    <div className="flex flex-1 items-end justify-center gap-1">
                      <div
                        title={`${e.title}: ${e.going} RSVP'd going`}
                        className="w-3 rounded-t"
                        style={{ height: `${(e.going / trendMax) * 100}%`, background: "#3a6ea5" }}
                      />
                      <div
                        title={`${e.title}: ${e.attended} attended`}
                        className="w-3 rounded-t bg-sunset"
                        style={{ height: `${(e.attended / trendMax) * 100}%` }}
                      />
                    </div>
                    <span className="truncate text-center text-[0.6rem] text-muted" title={e.title}>
                      {e.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Churn */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <h3 className="font-display text-base text-ink">Who&apos;s drifting away</h3>
            <p className="mt-1 text-xs text-muted">
              Riders who came to your rides in the previous 90 days but not the last 90.
            </p>
            {mine.churn.priorActive === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Not enough history yet — churn needs two 90-day windows of rides to compare.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-end gap-6">
                <div>
                  <p className="font-display text-4xl text-sunset">{pct(mine.churn.churnRate)}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">
                    {mine.churn.churned} of {mine.churn.priorActive} lapsed
                  </p>
                </div>
                <dl className="flex flex-1 gap-3 text-center">
                  <div className="flex-1 rounded-lg border border-border bg-canvas p-3">
                    <dt className="text-[0.6rem] uppercase tracking-wide text-muted">Retained</dt>
                    <dd className="mt-1 font-display text-xl text-forest">{mine.churn.retained}</dd>
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-canvas p-3">
                    <dt className="text-[0.6rem] uppercase tracking-wide text-muted">Lapsed</dt>
                    <dd className="mt-1 font-display text-xl text-red-600">{mine.churn.churned}</dd>
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-canvas p-3">
                    <dt className="text-[0.6rem] uppercase tracking-wide text-muted">New / back</dt>
                    <dd className="mt-1 font-display text-xl text-sky-600">{mine.churn.returningOrNew}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
