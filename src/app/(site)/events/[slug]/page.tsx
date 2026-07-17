import type { Metadata } from "next";
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
        {/* BREADCRUMB */}

        {/* TWO-COLUMN: Details | Flyer */}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_24rem]">
          {/* EVENT DETAILS */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            {/* HEADER: Title + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-semibold text-ink">{event.title}</h1>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{event.description ? <Linkify text={event.description} /> : "No event description yet."}</p>
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
            </div>

            {/* INFO CARDS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><CalendarDays className="h-3.5 w-3.5" />Date</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{formatDate(event.startsAt)}</p>
                <p className="text-xs text-muted">Meetup at {formatTime(event.startsAt)}</p>
              </div>
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><Clock3 className="h-3.5 w-3.5" />Kickstands Up</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{event.ksuAt ? formatTime(event.ksuAt) : "TBD"}</p>
                <p className="text-xs text-muted">{event.ksuAt ? formatDate(event.ksuAt) : "Time not set"}</p>
                {/* Only when the ride actually departs from somewhere else. Nearly
                    always it leaves from the meetup, and repeating that address
                    here would just be the same place written twice — but when it
                    does differ, a rider who misses it gets left behind. */}
                {departsElsewhere ? (
                  <div className="mt-2 border-t border-border pt-2">
                    <p className="text-xs font-medium text-ink">Departs from {event.ksuLocation}</p>
                    {event.ksuAddress ? (
                      <p className="text-xs text-muted">{event.ksuAddress}</p>
                    ) : null}
                    {event.ksuLat != null && event.ksuLng != null ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${event.ksuLat},${event.ksuLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        Directions
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><MapPin className="h-3.5 w-3.5" />{departsElsewhere ? "Meetup" : "Location"}</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{event.meetLocation || event.ksuLocation || "TBD"}</p>
                {event.meetAddress ? (
                  <p className="text-xs text-muted">{event.meetAddress}</p>
                ) : (
                  <p className="text-xs text-muted">Meetup point</p>
                )}
                {event.meetLat != null && event.meetLng != null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${event.meetLat},${event.meetLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
                  >
                    <MapPin className="h-3 w-3" />
                    Directions
                  </a>
                )}
              </div>
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><Signal className="h-3.5 w-3.5" />Pace</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{difficultyLabel(event.difficulty)}</p>
                <p className="text-xs text-muted">{event.distanceMiles ? `${event.distanceMiles} miles` : "Distance TBD"}</p>
              </div>
            </div>

            {/* HOST + DISTANCE + RSVP */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Host: <Link href={`/r/${event.host.handle}`} className="font-medium text-ink hover:text-sunset">{event.host.name}</Link></span>
                <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4 text-sunset" />Distance: <span className="font-medium text-ink">{event.distanceMiles ? `${event.distanceMiles} mi` : "TBD"}</span></span>
                <span className="inline-flex items-center gap-2">Tracking: <span className="font-medium text-ink">{trackedCount}</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {currentUser ? (
                  <form action={toggleEventFollowAction.bind(null, event.id)}>
                    <button type="submit" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt hover:border-asphalt">
                      {isTracking ? "Tracking" : "Track Event"}
                    </button>
                  </form>
                ) : null}
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
              </div>
            </div>
          </div>

          {/* FLYER IMAGE */}
          {event.galleryItems[0]?.url ? (
            <div className="relative overflow-hidden rounded-xl border border-border shadow-soft lg:self-stretch">
              <img
                src={mediaUrl(event.galleryItems[0].url)}
                alt={event.galleryItems[0].caption || `${event.title} flyer`}
                className="aspect-8.5/11 h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>

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

        {/* MESSAGE RIDERS — organizers only. Deliberately not gated on the ride
            being active: delays and route changes are announced beforehand. */}
        {isOrganizer && event.status !== "CANCELLED" ? (
          <div className="content-wrap">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
              <div>
                <p className="text-sm font-semibold text-ink">Organizer tools</p>
                <p className="text-xs text-muted">
                  Send an update, delay, or cancellation to the riders on this ride.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/events/${event.slug}/analytics`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
                >
                  <BarChart3 className="h-4 w-4 text-sunset" />
                  Analytics
                </Link>
                <MessageRidersDialog
                  eventId={event.id}
                  eventTitle={event.title}
                  counts={messageAudienceCounts}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* ATTENDANCE PANEL — organizers only */}
        {isOrganizer && (isActiveEvent || event.status === "COMPLETED") && attendeesForPanel.length > 0 && (
          <AttendancePanel
            eventId={event.id}
            attendees={attendeesForPanel}
            eventStatus={event.status}
          />
        )}

        {/* RIDER DOWN / SAFETY — organizers only */}
        {showSafetyPanel && (
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
        )}
      </div>
    </section>
  );
}
