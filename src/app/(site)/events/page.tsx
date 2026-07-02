import { CalendarDays, Clock, MapPin, Route, Signal, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";
import { prisma } from "@/lib/prisma";

function dateBadge(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { day: "--", month: "" };
  }
  return {
    day: String(parsed.getDate()).padStart(2, "0"),
    month: parsed.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
}

function formatEventTime(date: Date | null): string {
  if (!date) {
    return "TBD";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function deriveKsuTime(meetupAt: Date | null): string {
  if (!meetupAt) {
    return "TBD";
  }

  const ksuAt = new Date(meetupAt.getTime() + 15 * 60 * 1000);
  return formatEventTime(ksuAt);
}

export default async function EventsPage() {
  const now = new Date();
  const upcomingEvents = await prisma.rideEvent.findMany({
    where: { startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: 7,
    include: {
      _count: { select: { rsvps: true } },
    },
  });

  const totalUpcoming = await prisma.rideEvent.count({
    where: { startsAt: { gte: now } },
  });

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.events}
        eyebrow="Events"
        title="Upcoming Events"
        description="Group rides with clear route expectations, meetup points, and pace guidance. Reserve your spot and roll out with the crew."
      />

      {/* UPCOMING RIDES LIST */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-sunset" />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Upcoming Rides</h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/events/all"
                className="text-sm font-semibold text-sunset hover:underline"
              >
                View All Events{totalUpcoming > 7 ? ` (${totalUpcoming})` : ""}
              </Link>
              <Link
                href="/events/new"
                className="rounded-md border border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-asphalt hover:border-asphalt"
              >
                Create Event
              </Link>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {upcomingEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted shadow-soft">
                No upcoming events yet. Create the first community event.
              </div>
            ) : null}
            {upcomingEvents.map((event, i) => {
              const badge = dateBadge(event.startsAt.toISOString());
              const meetupAt = event.startsAt;
              const meetupTime = formatEventTime(meetupAt);
              const ksuTime = event.ksuAt ? formatEventTime(event.ksuAt) : deriveKsuTime(meetupAt);
              return (
                <article
                  key={event.id}
                  className="grid gap-0 overflow-hidden rounded-xl border border-border bg-surface shadow-soft lg:grid-cols-[18rem_1fr_16rem]"
                >
                  {/* PHOTO + DATE BADGE */}
                  <div
                    className="relative h-48 bg-cover bg-center lg:h-full"
                    style={{ backgroundImage: `url(${siteImages.rides[i % siteImages.rides.length]})` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-asphalt/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-white text-asphalt shadow-soft">
                      <span className="font-display text-2xl font-bold leading-none">{badge.day}</span>
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sunset">{badge.month}</span>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-6">
                    <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-asphalt">{event.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{event.description || "No event description yet."}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5 text-sunset" />{event.distanceMiles ? `${event.distanceMiles} miles` : "Distance TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{event.difficulty ? event.difficulty.replaceAll("_", " ") : "Difficulty TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-sunset" />Community ride</span>
                    </div>
                  </div>

                  {/* META + RSVP */}
                  <div className="flex flex-col justify-center gap-3 border-t border-border p-6 lg:border-l lg:border-t-0">
                    <p className="flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4 text-sunset" />{event.meetLocation || event.ksuLocation || "Location TBD"}</p>
                    <p className="flex items-center gap-2 text-sm text-muted"><Clock className="h-4 w-4 text-sunset" />Meetup: {meetupTime}</p>
                    <p className="flex items-center gap-2 text-sm text-muted"><Ticket className="h-4 w-4 text-sunset" />KSU: {ksuTime}</p>
                    {event._count.rsvps > 0 ? (
                      <p className="flex items-center gap-2 text-xs font-medium text-muted">
                        <Users className="h-3.5 w-3.5 text-sunset" />
                        {event._count.rsvps} rider{event._count.rsvps !== 1 ? "s" : ""} registered
                      </p>
                    ) : null}
                    <Link href={`/events/${event.slug}`} className="mt-2 rounded-md bg-sunset px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#cf5a26]">
                      View Event
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED ROADS CTA */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <article
            className="relative overflow-hidden rounded-xl border border-border shadow-soft"
            style={{ backgroundImage: `url(${siteImages.ctaRoad})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0 bg-asphalt/75" aria-hidden="true" />
            <div className="relative flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="text-white">
                <h2 className="font-display text-2xl font-bold tracking-tight">Explore Featured Roads</h2>
                <p className="mt-2 max-w-lg text-sm text-slate-200">
                  Discover rider-shared routes around Clarksville with saved geometry, scenic ratings, and road notes. Route planning is built into every event.
                </p>
              </div>
              <Link
                href="/roads"
                className="shrink-0 rounded-md bg-sunset px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#cf5a26]"
              >
                View Roads
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
