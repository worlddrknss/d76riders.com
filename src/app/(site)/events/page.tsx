import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import { CalendarDays, Clock, MapPin, Route, Signal, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { siteImages } from "@/data/images";
import { mediaUrl } from "@/lib/media-url";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { eventDayMonth, formatEventTimeShort, startOfTodayUtc } from "@/lib/datetime";
import { PUBLIC_EVENT_STATUSES } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Upcoming Rides & Events",
  description:
    "Browse upcoming group rides, meetups, and motorcycle events organized by District 76 Riders in Tennessee and beyond. All skill levels welcome.",
  alternates: { canonical: "/events" },
  openGraph: {
    images: OG_IMAGE,
    title: "Rides & Events — District 76 Riders",
    description: "Find your next group ride in Tennessee and beyond.",
  },
};

export default async function EventsPage() {
  // "Upcoming" means today or later, in the viewer's zone — so a ride happening
  // this evening stays listed all day rather than dropping off at its start
  // time. Logged-out visitors get the community default zone.
  const currentUser = await getCurrentUser();
  const viewerTz = currentUser
    ? (await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { timezone: true } }))?.timezone ?? null
    : null;

  // A cancelled or draft ride isn't an upcoming ride. Without this, moderation
  // cancelling an event (which is what the triage queue's takedown does) left it
  // still advertising itself here and still taking RSVPs.
  const publiclyVisible = { startsAt: { gte: startOfTodayUtc(viewerTz) }, status: { in: PUBLIC_EVENT_STATUSES } };

  const upcomingEvents = await prisma.rideEvent.findMany({
    where: publiclyVisible,
    orderBy: { startsAt: "asc" },
    take: 7,
    include: {
      // GOING only — counting every RSVP row meant riders who answered NOT_GOING
      // inflated the "N riders" on the card.
      _count: { select: { rsvps: { where: { status: "GOING" } } } },
      galleryItems: { take: 1, select: { url: true } },
    },
  });

  const totalUpcoming = await prisma.rideEvent.count({
    where: publiclyVisible,
  });

  return (
    <AppShell>
      <PageHeader
        icon={CalendarDays}
        title="Events"
        subtitle="Group rides with clear route expectations, meetup points, and pace guidance. Reserve your spot and roll out with the community."
      />

      {/* UPCOMING RIDES LIST */}
      <section className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-sunset" />
              <h2 className="font-display text-xl uppercase tracking-tight text-asphalt">Upcoming Rides</h2>
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

          <StaggerList className="mt-6 space-y-5">
            {upcomingEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted shadow-soft">
                No upcoming events yet. Create the first community event.
              </div>
            ) : null}
            {upcomingEvents.map((event, i) => {
              const badge = eventDayMonth(event.startsAt, event.timezone);
              const meetupTime = formatEventTimeShort(event.startsAt, event.timezone);
              const ksuTime = event.ksuAt ? formatEventTimeShort(event.ksuAt, event.timezone) : "TBD";
              const coverImage = event.galleryItems[0]?.url ? mediaUrl(event.galleryItems[0].url) : siteImages.rides[i % siteImages.rides.length];
              return (
                <StaggerItem key={event.id}>
                <article
                  className="grid gap-0 overflow-hidden rounded-xl border border-border bg-surface shadow-soft lg:grid-cols-[18rem_1fr_16rem]"
                >
                  {/* PHOTO + DATE BADGE */}
                  <div
                    className="relative h-48 bg-cover bg-center lg:h-full"
                    style={{ backgroundImage: `url(${coverImage})` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-asphalt/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-white text-asphalt shadow-soft">
                      <span className="font-display text-2xl leading-none">{badge.day}</span>
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sunset">{badge.month}</span>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-6">
                    <h3 className="font-display text-2xl uppercase tracking-tight text-asphalt">{event.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{event.excerpt || "No event excerpt yet."}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5 text-sunset" />{event.distanceMiles ? `${event.distanceMiles} miles` : "Distance TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{event.difficulty ? event.difficulty.replaceAll("_", " ") : "Difficulty TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-sunset" />Community ride</span>
                    </div>
                  </div>

                  {/* META + RSVP */}
                  <div className="flex flex-col justify-center gap-3 border-t border-border p-6 lg:border-l lg:border-t-0">
                    {/* The address matters as much as the venue name: "QuikTrip"
                        alone doesn't tell a rider which QuikTrip. */}
                    <div className="flex items-start gap-2 text-sm text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                      <span className="min-w-0">
                        <span className="block">{event.meetLocation || event.ksuLocation || "Location TBD"}</span>
                        {event.meetAddress ? (
                          <span className="block text-xs">{event.meetAddress}</span>
                        ) : null}
                      </span>
                    </div>
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
                </StaggerItem>
              );
            })}
          </StaggerList>
      </section>

      {/* FEATURED ROADS CTA */}
      <section>
          <article
            className="relative overflow-hidden rounded-xl border border-border shadow-soft"
            style={{ backgroundImage: `url(${siteImages.ctaRoad})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0 bg-asphalt/75" aria-hidden="true" />
            <div className="relative flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="text-white">
                <h2 className="font-display text-2xl tracking-tight">Explore Featured Roads</h2>
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
      </section>
    </AppShell>
  );
}
