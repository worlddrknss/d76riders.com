import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, CalendarDays, ChevronRight, Clock3, MapPin, Route as RouteIcon, Signal, UserRound } from "lucide-react";

import { EventManageActions } from "@/components/events/event-manage-actions";
import { ksuLocationDiffers } from "@/lib/events";
import { EventQrCode } from "@/components/events/event-qr-code";
import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { EventCheckInButton } from "@/components/events/event-check-in-button";
import { AttendancePanel } from "@/components/events/attendance-panel";
import { RiderDownPanel } from "@/components/events/rider-down-panel";
import { EventOrganizers } from "@/components/events/event-organizers";
import { MessageRidersDialog } from "@/components/events/message-riders-dialog";
import { RouteExportOptions } from "@/components/events/route-export-options";
import { ShareEvent } from "@/components/events/share-event";
import { Linkify } from "@/components/ui/linkify";
import { toggleEventFollowAction } from "@/app/(site)/garage/mine/actions";
import { RouteMap } from "@/components/routes/route-map";
import { JsonLd, eventJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";
import type { PlannerWaypoint, WaypointKind } from "@/lib/routing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.rideEvent.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      description: true,
      meetLocation: true,
      startsAt: true,
      status: true,
      distanceMiles: true,
      galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
    },
  });
  if (!event) return { title: "Event Not Found" };

  const when = event.startsAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Prefer the hand-written excerpt; fall back to the description, then to a
  // generated line that still carries the date, distance, and start point.
  const description = (
    event.excerpt?.trim() ||
    event.description?.trim() ||
    [
      `Group motorcycle ride on ${when} with District 76 Riders`,
      event.meetLocation ? `departing from ${event.meetLocation}` : null,
      event.distanceMiles ? `${event.distanceMiles} miles` : null,
    ]
      .filter(Boolean)
      .join(" · ")
  ).slice(0, 160);

  const image = event.galleryItems[0]?.url ? mediaUrl(event.galleryItems[0].url) : undefined;

  return {
    title: `${event.title} — ${when}`,
    description,
    alternates: { canonical: `/events/${slug}` },
    // Cancelled rides shouldn't keep collecting search traffic.
    robots: event.status === "CANCELLED" ? { index: false, follow: true } : undefined,
    openGraph: {
      title: event.title,
      description,
      type: "article",
      url: `/events/${slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function difficultyLabel(value: string | null): string {
  switch (value) {
    case "BEGINNER_FRIENDLY":
      return "Beginner Friendly";
    case "INTERMEDIATE":
      return "Intermediate";
    case "SCENIC":
      return "Scenic";
    default:
      return "Not specified";
  }
}

// A labelled fact in the sidebar — icon, label, value, optional secondary line.
// The old four-box grid became this: the same facts, without four borders
// competing for attention with the actual call to action beneath them.
function DetailRow({
  icon: Icon,
  label,
  children,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        <div className="text-sm font-medium text-ink">{children}</div>
        {sub ? <div className="text-xs text-muted">{sub}</div> : null}
      </div>
    </div>
  );
}

// Format a Date as YYYY-MM-DDTHH:mm string preserving the raw stored values
// (dates are stored naive/UTC-as-local in the DB)
function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function extractCoordinates(value: unknown): [number, number][] {
  if (!value || typeof value !== "object" || !("coordinates" in value)) {
    return [];
  }

  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates.filter(
    (point): point is [number, number] =>
      Array.isArray(point) && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number",
  );
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const event = await prisma.rideEvent.findUnique({
    where: { slug },
    include: {
      host: {
        select: {
          userId: true,
          name: true,
          handle: true,
        },
      },
      crew: { select: { name: true, slug: true } },
      sponsors: {
        // A sponsor linked to a ride still has to be approved and active to be
        // shown — the approval gate belongs on every public surface, not just
        // /sponsors.
        where: { sponsor: { status: "APPROVED", active: true } },
        select: {
          id: true,
          sponsor: { select: { name: true, logoUrl: true, websiteUrl: true, tier: true } },
        },
      },
      route: {
        include: {
          waypoints: {
            orderBy: { order: "asc" },
          },
        },
      },
      galleryItems: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      rsvps: {
        where: { status: "GOING" },
        select: {
          riderId: true,
          rider: {
            select: {
              handle: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      followers: {
        select: { riderId: true },
      },
      organizers: {
        select: {
          id: true,
          role: true,
          rider: { select: { id: true, userId: true, name: true, handle: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      checkIns: {
        select: {
          riderId: true,
          checkInAt: true,
          checkOutAt: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Nearly every ride departs from its meetup point, so KSU only gets its own
  // address when the ride genuinely stages somewhere else.
  const departsElsewhere = ksuLocationDiffers(event);

  const coordinates = extractCoordinates(event.route?.geometry);

  const waypoints: PlannerWaypoint[] = (event.route?.waypoints ?? []).map((waypoint) => ({
    id: waypoint.id,
    lng: waypoint.lng,
    lat: waypoint.lat,
    label: waypoint.label ?? undefined,
    kind: waypoint.type as WaypointKind,
  }));

  const isOwner = currentUser?.id === event.host.userId;
  const isOrganizer = currentUser
    ? event.organizers.some((o) => o.rider.userId === currentUser.id)
    : false;
  const isHost = currentUser
    ? event.organizers.some((o) => o.rider.userId === currentUser.id && o.role === "HOST")
    : false;

  // Look up current user's rider once and reuse for RSVP, tracking, check-in.
  const viewerRider = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  // Audience sizes for the organizer's message dialog. `event.rsvps` only holds
  // GOING, so the other states need their own count.
  const rsvpStatusCounts = isOrganizer
    ? await prisma.rsvp.groupBy({
        by: ["status"],
        where: { eventId: event.id },
        _count: { status: true },
      })
    : [];
  const countFor = (status: string) =>
    rsvpStatusCounts.find((row) => row.status === status)?._count.status ?? 0;
  const messageAudienceCounts = {
    going: countFor("GOING"),
    waitlisted: countFor("WAITLISTED"),
    interested: countFor("INTERESTED"),
    checkedIn: event.checkIns.length,
  };

  // Viewer's own RSVP status (GOING or WAITLISTED — event.rsvps only lists GOING).
  let currentRsvp: "GOING" | "WAITLISTED" | null = null;
  if (viewerRider) {
    const viewerRsvp = await prisma.rsvp.findUnique({
      where: { eventId_riderId: { eventId: event.id, riderId: viewerRider.id } },
      select: { status: true },
    });
    if (viewerRsvp?.status === "GOING") currentRsvp = "GOING";
    else if (viewerRsvp?.status === "WAITLISTED") currentRsvp = "WAITLISTED";
  }

  const attendeeCount = event.rsvps.length;
  const waitlistCount = await prisma.rsvp.count({
    where: { eventId: event.id, status: "WAITLISTED" },
  });
  const trackedCount = event.followers.length;
  const isTracking = viewerRider ? event.followers.some((item) => item.riderId === viewerRider.id) : false;

  const now = new Date();
  const rsvpClosed = event.rsvpDeadline ? event.rsvpDeadline.getTime() < now.getTime() : false;
  const capacityFull = event.maxCapacity != null && attendeeCount >= event.maxCapacity;

  // Check-in state
  const eventDate = event.startsAt;
  const isEventDay = eventDate.getUTCFullYear() === now.getUTCFullYear()
    && eventDate.getUTCMonth() === now.getUTCMonth()
    && eventDate.getUTCDate() === now.getUTCDate();
  const isActiveEvent = event.status === "UPCOMING" && isEventDay;
  const viewerCheckIn = viewerRider
    ? event.checkIns.find((c) => c.riderId === viewerRider.id)
    : null;
  const canCheckIn = isActiveEvent && currentRsvp === "GOING" && currentUser;

  // Build attendee list for organizer attendance panel
  const attendeesForPanel = isOrganizer
    ? event.rsvps.map((rsvp) => {
        const checkIn = event.checkIns.find((c) => c.riderId === rsvp.riderId);
        return {
          riderId: rsvp.riderId,
          name: rsvp.rider.name,
          handle: rsvp.rider.handle,
          avatarUrl: rsvp.rider.avatarUrl,
          checkIn: checkIn
            ? { checkInAt: checkIn.checkInAt.toISOString(), checkOutAt: checkIn.checkOutAt?.toISOString() ?? null }
            : null,
        };
      })
    : [];

  // Rider Down: checked-in riders the organizer can flag, plus the incident log.
  const showSafetyPanel = isOrganizer && (isActiveEvent || event.status === "COMPLETED");
  const checkedInRoster = showSafetyPanel
    ? attendeesForPanel
        .filter((a) => a.checkIn)
        .map((a) => ({ riderId: a.riderId, name: a.name }))
    : [];
  const incidents = showSafetyPanel
    ? await prisma.rideIncident.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          notes: true,
          locationText: true,
          lat: true,
          lng: true,
          resolvedAt: true,
          createdAt: true,
          rider: { select: { name: true, handle: true } },
          reportedBy: { select: { name: true } },
        },
      })
    : [];

  // Built once, placed twice: at the top of the sidebar during a live ride
  // (an emergency lever has to be reachable in seconds), and as a review log at
  // the bottom of a completed ride. Never both — an event is one or the other.
  const safetyPanel = showSafetyPanel ? (
    <RiderDownPanel
      eventId={event.id}
      roster={checkedInRoster}
      incidents={incidents.map((i) => ({
        id: i.id,
        riderName: i.rider.name,
        riderHandle: i.rider.handle,
        reportedByName: i.reportedBy.name,
        notes: i.notes,
        locationText: i.locationText,
        lat: i.lat,
        lng: i.lng,
        resolvedAt: i.resolvedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  ) : null;

  const statusMeta =
    event.status === "CANCELLED"
      ? { label: "Cancelled", cls: "border-red-300 bg-red-50 text-red-700" }
      : isActiveEvent
        ? { label: "Riding today", cls: "border-sunset/40 bg-sunset/10 text-sunset" }
        : event.status === "COMPLETED"
          ? { label: "Completed", cls: "border-border bg-canvas text-muted" }
          : { label: "Upcoming", cls: "border-forest/40 bg-forest/10 text-forest" };

  return (
    <section className="page-shell">
      <JsonLd data={eventJsonLd({
        title: event.title,
        slug: event.slug,
        description: event.description,
        date: event.startsAt,
        location: event.meetLocation,
        imageUrl: event.galleryItems[0]?.url ? mediaUrl(event.galleryItems[0].url) : undefined,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", href: "/" },
        { name: "Events", href: "/events" },
        { name: event.title, href: `/events/${event.slug}` },
      ])} />

      {event.crew || event.sponsors.length > 0 ? (
        <div className="content-wrap">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
            {event.crew ? (
              <Link
                href={`/crews/${event.crew.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-sunset/40 bg-sunset/10 px-3 py-1 text-xs font-semibold text-sunset hover:bg-sunset/20"
              >
                {event.crew.name} crew
              </Link>
            ) : null}

            {event.sponsors.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Supported by
                </span>
                {event.sponsors.map(({ id, sponsor }) =>
                  sponsor.websiteUrl ? (
                    <a
                      key={id}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-sunset"
                    >
                      {sponsor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sponsor.logoUrl} alt="" className="h-6 w-auto object-contain" />
                      ) : null}
                      {sponsor.name}
                    </a>
                  ) : (
                    <span key={id} className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      {sponsor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sponsor.logoUrl} alt="" className="h-6 w-auto object-contain" />
                      ) : null}
                      {sponsor.name}
                    </span>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="content-wrap space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
          <Link href="/" className="text-muted transition hover:text-sunset">Home</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <Link href="/events" className="text-muted transition hover:text-sunset">Events</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="truncate text-asphalt">{event.title}</span>
        </nav>

        {/* Header: title, status, quick facts, and the share/manage actions. The
            facts here are the scan-at-a-glance version; the sidebar has the full
            set with directions and the call to action. */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{event.title}</h1>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            </div>
            {event.excerpt ? <p className="mt-2 max-w-2xl text-sm text-muted">{event.excerpt}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-sunset" />{formatDate(event.startsAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-sunset" />Meet {formatTime(event.startsAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Signal className="h-4 w-4 text-sunset" />{difficultyLabel(event.difficulty)}</span>
              {event.distanceMiles ? (
                <span className="inline-flex items-center gap-1.5"><RouteIcon className="h-4 w-4 text-sunset" />{event.distanceMiles} mi</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ShareEvent title={event.title} slug={event.slug} />
            <EventQrCode eventUrl={`/events/${event.slug}`} eventTitle={event.title} />
            {(isOwner || isOrganizer) && (
              <EventManageActions
                event={{
                  id: event.id,
                  title: event.title,
                  excerpt: event.excerpt,
                  description: event.description,
                  facebookEventUrl: event.facebookEventUrl,
                  startsAt: toLocalISOString(event.startsAt),
                  ksuAt: event.ksuAt ? toLocalISOString(event.ksuAt) : null,
                  meetLocation: event.meetLocation,
                  meetAddress: event.meetAddress,
                  meetLat: event.meetLat,
                  meetLng: event.meetLng,
                  ksuLocation: event.ksuLocation,
                  ksuAddress: event.ksuAddress,
                  ksuLat: event.ksuLat,
                  ksuLng: event.ksuLng,
                  distanceMiles: event.distanceMiles,
                  difficulty: event.difficulty,
                  maxCapacity: event.maxCapacity,
                  rsvpDeadline: event.rsvpDeadline ? toLocalISOString(event.rsvpDeadline) : null,
                  hasPhoto: event.galleryItems.length > 0,
                  hasRoute: !!event.routeId,
                }}
              />
            )}
          </div>
        </header>

        {/* Content + sticky action rail. The rail is first in the DOM so a phone
            leads with the facts and the RSVP / check-in / Rider Down actions,
            before the flyer and the long stuff; on desktop it moves to the right
            and sticks while the main column scrolls. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
          <aside className="space-y-4 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start">
            {/* Live ride: the emergency lever comes first. */}
            {isActiveEvent ? safetyPanel : null}

            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <dl className="space-y-3.5">
                <DetailRow icon={CalendarDays} label="Date" sub={`Meetup at ${formatTime(event.startsAt)}`}>
                  {formatDate(event.startsAt)}
                </DetailRow>
                <DetailRow icon={Clock3} label="Kickstands up" sub={event.ksuAt ? formatDate(event.ksuAt) : "Time not set"}>
                  {event.ksuAt ? formatTime(event.ksuAt) : "TBD"}
                </DetailRow>
                <DetailRow
                  icon={MapPin}
                  label={departsElsewhere ? "Meetup" : "Location"}
                  sub={
                    <>
                      {event.meetAddress ?? "Meetup point"}
                      {event.meetLat != null && event.meetLng != null ? (
                        <>
                          {" · "}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${event.meetLat},${event.meetLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-sunset hover:underline"
                          >
                            Directions
                          </a>
                        </>
                      ) : null}
                    </>
                  }
                >
                  {event.meetLocation || event.ksuLocation || "TBD"}
                </DetailRow>
                {departsElsewhere ? (
                  <DetailRow
                    icon={MapPin}
                    label="Departs from"
                    sub={
                      <>
                        {event.ksuAddress ?? null}
                        {event.ksuLat != null && event.ksuLng != null ? (
                          <>
                            {event.ksuAddress ? " · " : null}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${event.ksuLat},${event.ksuLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-sunset hover:underline"
                            >
                              Directions
                            </a>
                          </>
                        ) : null}
                      </>
                    }
                  >
                    {event.ksuLocation}
                  </DetailRow>
                ) : null}
                <DetailRow icon={Signal} label="Pace" sub={event.distanceMiles ? `${event.distanceMiles} miles` : "Distance TBD"}>
                  {difficultyLabel(event.difficulty)}
                </DetailRow>
                <DetailRow icon={UserRound} label="Host">
                  <Link href={`/r/${event.host.handle}`} className="hover:text-sunset">{event.host.name}</Link>
                </DetailRow>
              </dl>

              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <EventRsvpButton
                  eventId={event.id}
                  currentRsvp={currentRsvp}
                  attendeeCount={attendeeCount}
                  waitlistCount={waitlistCount}
                  capacity={event.maxCapacity}
                  capacityFull={capacityFull}
                  rsvpClosed={rsvpClosed}
                  rsvpDeadline={event.rsvpDeadline ? formatDate(event.rsvpDeadline) : null}
                  isLoggedIn={!!currentUser}
                />
                {canCheckIn && (
                  <EventCheckInButton
                    eventId={event.id}
                    isCheckedIn={!!viewerCheckIn}
                    isCheckedOut={!!viewerCheckIn?.checkOutAt}
                  />
                )}
                {currentUser ? (
                  <form action={toggleEventFollowAction.bind(null, event.id)}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt transition hover:border-asphalt"
                    >
                      {isTracking ? "Tracking this ride" : "Track event"}
                    </button>
                  </form>
                ) : null}
                <p className="pt-1 text-center text-xs text-muted">
                  {attendeeCount} going · {trackedCount} tracking
                </p>
              </div>
            </div>

            {/* Organizer tools — a couple of links and a modal, not a card each. */}
            {isOrganizer && event.status !== "CANCELLED" ? (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Organizer</p>
                <div className="mt-3 space-y-2.5">
                  <Link
                    href={`/events/${event.slug}/analytics`}
                    className="flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-sunset"
                  >
                    <BarChart3 className="h-4 w-4 text-sunset" />
                    View ride analytics
                  </Link>
                  <MessageRidersDialog
                    eventId={event.id}
                    eventTitle={event.title}
                    counts={messageAudienceCounts}
                  />
                </div>
              </div>
            ) : null}
          </aside>

          {/* MAIN column */}
          <div className="space-y-6 lg:col-start-1 lg:row-start-1">
            {/* Flyer */}
            {event.galleryItems[0]?.url ? (
              <div className="overflow-hidden rounded-xl border border-border bg-canvas shadow-soft">
                <img
                  src={mediaUrl(event.galleryItems[0].url)}
                  alt={event.galleryItems[0].caption || `${event.title} flyer`}
                  className="mx-auto max-h-136 w-auto object-contain"
                />
              </div>
            ) : null}

            {/* About */}
            {event.description ? (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                <h2 className="font-display text-lg font-semibold text-asphalt">About this ride</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                  <Linkify text={event.description} />
                </p>
              </div>
            ) : null}

        {/* FULL-WIDTH ROUTE MAP */}
        {coordinates.length >= 2 ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-asphalt">Official Route</h2>
                <p className="mt-1 text-sm text-muted">Saved route attached to this event.</p>
              </div>
              <RouteExportOptions
                coordinates={coordinates}
                waypoints={waypoints}
                eventTitle={event.title}
              />
            </div>
            <div className="mt-4">
              <RouteMap coordinates={coordinates} waypoints={waypoints} className="h-120 w-full" />
            </div>
          </div>
        ) : null}

        {/* REGISTERED RIDERS */}
        {event.rsvps.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <h2 className="font-display text-xl font-semibold text-asphalt">
              Registered Riders
              <span className="ml-2 text-sm font-normal text-muted">({event.rsvps.length})</span>
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.rsvps.map((rsvp) => (
                <Link
                  key={rsvp.riderId}
                  href={`/r/${rsvp.rider.handle}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-3 transition hover:border-sunset/30 hover:shadow-sm"
                >
                  {rsvp.rider.avatarUrl ? (
                    <img src={mediaUrl(rsvp.rider.avatarUrl)} alt={rsvp.rider.name} className="h-10 w-10 rounded-full border border-border object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset/10 text-sm font-bold text-sunset">
                      {rsvp.rider.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink">{rsvp.rider.name}</p>
                    <p className="text-xs text-muted">@{rsvp.rider.handle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* RIDE STAFF */}
        {event.organizers.length > 0 && (
          <EventOrganizers
            eventId={event.id}
            organizers={event.organizers.map((o) => ({
              id: o.id,
              role: o.role,
              rider: { name: o.rider.name, handle: o.rider.handle },
            }))}
            isHost={isHost}
          />
        )}

            {/* Attendance — organizers, during or after the ride */}
            {isOrganizer && (isActiveEvent || event.status === "COMPLETED") && attendeesForPanel.length > 0 && (
              <AttendancePanel
                eventId={event.id}
                attendees={attendeesForPanel}
                eventStatus={event.status}
              />
            )}

            {/* Post-ride: the incident log is review material, so it stays down
                here rather than up in the live-ride safety slot. */}
            {event.status === "COMPLETED" ? safetyPanel : null}
          </div>
        </div>
      </div>
    </section>
  );
}
