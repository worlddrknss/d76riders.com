import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, CalendarDays, CalendarPlus, ChevronRight, Clock3, Flag, MapPin, Route as RouteIcon, Signal, UserCheck, UserRound } from "lucide-react";
import { SiFacebook } from "@icons-pack/react-simple-icons";

import { AppShell } from "@/components/layout/app-shell";
import { EventManageActions } from "@/components/events/event-manage-actions";
import {
  DEFAULT_TIMEZONE,
  formatEventDate,
  formatEventTime,
  isSameDayInTz,
  toZonedInputValue,
  viewerTimeHint,
} from "@/lib/datetime";
import { EventQrCode } from "@/components/events/event-qr-code";
import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { EventCheckInButton } from "@/components/events/event-check-in-button";
import { AttendancePanel } from "@/components/events/attendance-panel";
import { RiderDownPanel } from "@/components/events/rider-down-panel";
import { EventGallery } from "@/components/events/event-gallery";
import { EventOrganizers } from "@/components/events/event-organizers";
import { EventRoutePlannerButton } from "@/components/events/event-route-planner-button";
import { EventRecap } from "@/components/events/event-recap";
import { isGalleryOpen } from "@/lib/event-gallery";
import { EventRidersList } from "@/components/events/event-riders-list";
import { MessageRidersDialog } from "@/components/events/message-riders-dialog";
import { RouteExportOptions } from "@/components/events/route-export-options";
import { ShareEvent } from "@/components/events/share-event";
import { Linkify } from "@/components/ui/linkify";
import { toggleEventFollowAction } from "@/app/(site)/garage/mine/actions";
import { RouteMap } from "@/components/routes/route-map";
import { RouteStops } from "@/components/routes/route-stops";
import { LiveRideMap } from "@/components/events/live-ride-map";
import { ReportHazardDialog } from "@/components/hazards/report-hazard-dialog";
import { HazardList } from "@/components/hazards/hazard-list";
import { elevationDifficulty } from "@/lib/elevation";
import { activeHazardWhere } from "@/lib/hazards";
import { getDailyForecast, withinForecastWindow } from "@/lib/weather";
import { EventWeatherPanel } from "@/components/weather/weather-panel";
import { JsonLd, eventJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { prisma } from "@/lib/prisma";
import { mediaUrl, ogImageUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";
import { postableCrews } from "@/lib/crews";
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
      timezone: true,
      status: true,
      distanceMiles: true,
      galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
    },
  });
  if (!event) return { title: "Event Not Found" };

  const when = formatEventDate(event.startsAt, event.timezone);

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

  // The organizer's flyer, transcoded to JPEG so Facebook/OG scrapers render it
  // (they skip our WebP uploads and otherwise fall back to a page image).
  const image = ogImageUrl(event.galleryItems[0]?.url);

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
      images: image ? [{ url: image, type: "image/jpeg" }] : undefined,
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

  const coordinates = extractCoordinates(event.route?.geometry);

  const waypoints: PlannerWaypoint[] = (event.route?.waypoints ?? []).map((waypoint) => ({
    id: waypoint.id,
    lng: waypoint.lng,
    lat: waypoint.lat,
    label: waypoint.label ?? undefined,
    kind: waypoint.type as WaypointKind,
  }));

  // Same difficulty-from-elevation read as the road detail page, when the event's
  // route carries a climb estimate.
  const eventElevationGainFt = event.route?.elevationGainFt ?? null;
  const eventClimb = elevationDifficulty(event.distanceMiles, eventElevationGainFt);

  const isOwner = currentUser?.id === event.host.userId;
  const isOrganizer = currentUser
    ? event.organizers.some((o) => o.rider.userId === currentUser.id)
    : false;
  const isHost = currentUser
    ? event.organizers.some((o) => o.rider.userId === currentUser.id && o.role === "HOST")
    : false;

  // Look up current user's rider once and reuse for RSVP, tracking, check-in,
  // and the "your time" hint on event times.
  const viewerRider = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true, timezone: true } })
    : null;
  const viewerTz = viewerRider?.timezone ?? null;
  // Sub-communities the managing organizer can move this ride into (their own).
  const manageableCrews =
    viewerRider && (isOwner || isOrganizer) ? await postableCrews(viewerRider.id) : [];

  // Community gallery: attendee-uploaded photos (riderId set) — distinct from the
  // organizer's cover flyer (riderId null), so the two never mix.
  const galleryRows = await prisma.galleryItem.findMany({
    where: { eventId: event.id, riderId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, url: true, caption: true, riderId: true, rider: { select: { name: true, handle: true } } },
  });
  const isStaffViewer = Boolean(
    currentUser?.roles.includes("ADMINISTRATOR") || currentUser?.roles.includes("MODERATOR"),
  );

  // Rider-flagged hazards on this event's route — same model as featured roads,
  // just keyed by routeId. Gated on the route having geometry to drop pins on.
  const hasRouteGeometry = coordinates.length >= 2;
  const eventHazards =
    hasRouteGeometry && event.routeId
      ? await prisma.hazardReport.findMany({
          where: { routeId: event.routeId, ...activeHazardWhere() },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            lat: true,
            lng: true,
            description: true,
            createdAt: true,
            riderId: true,
            rider: { select: { name: true, handle: true } },
          },
        })
      : [];
  const eventHazardPins = eventHazards.map((h) => ({ id: h.id, type: h.type, lat: h.lat, lng: h.lng }));
  const eventHazardListItems = eventHazards.map((h) => ({
    id: h.id,
    type: h.type,
    description: h.description,
    createdAt: h.createdAt.toISOString(),
    reporterName: h.rider.name,
    reporterHandle: h.rider.handle,
    canClear: isStaffViewer || isHost || isOwner || h.riderId === viewerRider?.id,
  }));
  const hazardDefaultPoint =
    event.route?.ksuLat != null && event.route?.ksuLng != null
      ? { lat: event.route.ksuLat, lng: event.route.ksuLng }
      : coordinates.length > 0
        ? { lat: coordinates[Math.floor(coordinates.length / 2)][1], lng: coordinates[Math.floor(coordinates.length / 2)][0] }
        : { lat: event.meetLat ?? 0, lng: event.meetLng ?? 0 };
  const eventPhotos = galleryRows.map((p) => ({
    id: p.id,
    url: p.url,
    caption: p.caption,
    uploaderName: p.rider?.name ?? null,
    uploaderHandle: p.rider?.handle ?? null,
    canDelete: (viewerRider != null && p.riderId === viewerRider.id) || isOrganizer || isStaffViewer,
  }));

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
    tracking: event.followers.length,
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

  // Check-in state — "today" is judged in the event's own timezone.
  const isEventDay = isSameDayInTz(event.startsAt, event.timezone);
  const isActiveEvent = event.status === "UPCOMING" && isEventDay;

  // Ride-day forecast — only for an upcoming, mapped meetup inside the forecast
  // window (Open-Meteo ~16 days out). Best-effort; null hides the panel.
  const eventDateLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: event.timezone ?? DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(event.startsAt);
  const eventWeather =
    event.status === "UPCOMING" &&
    event.meetLat != null &&
    event.meetLng != null &&
    withinForecastWindow(eventDateLocal, now)
      ? await getDailyForecast(event.meetLat, event.meetLng, eventDateLocal)
      : null;
  // A ride whose start time has passed but was never closed — organizers still
  // need to manage attendance and close it out.
  const hasStarted = event.startsAt.getTime() <= now.getTime();
  // Only set when the viewer's zone differs from the event's.
  const meetHint = viewerTimeHint(event.startsAt, event.timezone, viewerTz);
  const viewerCheckIn = viewerRider
    ? event.checkIns.find((c) => c.riderId === viewerRider.id)
    : null;
  const canCheckIn = isActiveEvent && currentRsvp === "GOING" && currentUser;

  // Live ride map — on ride day, participants (organizer / GOING / checked-in)
  // see everyone sharing; only currently-checked-in riders can broadcast.
  const canSeeLive = Boolean(currentUser && (isOrganizer || currentRsvp === "GOING" || viewerCheckIn));
  const showLiveMap = isActiveEvent && canSeeLive && coordinates.length >= 2;
  const canShareLive = Boolean(viewerCheckIn && !viewerCheckIn.checkOutAt);

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

  const flyerUrl = event.galleryItems[0]?.url ?? null;
  const aboutCard = event.description || eventWeather ? (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-lg text-asphalt">About this ride</h2>
      {event.description ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
          <Linkify text={event.description} />
        </p>
      ) : null}
      {eventWeather ? (
        <div className={event.description ? "mt-4" : "mt-3"}>
          <EventWeatherPanel forecast={eventWeather} />
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <AppShell>
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
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
            {event.crew ? (
              <Link
                href={`/sub-communities/${event.crew.slug}`}
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
                         
                        <img src={sponsor.logoUrl} alt="" className="h-6 w-auto object-contain" />
                      ) : null}
                      {sponsor.name}
                    </a>
                  ) : (
                    <span key={id} className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      {sponsor.logoUrl ? (
                         
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
      <div className="space-y-6">
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
              <h1 className="font-display text-3xl text-ink sm:text-4xl">{event.title}</h1>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            </div>
            {event.excerpt ? <p className="mt-2 max-w-2xl text-sm text-muted">{event.excerpt}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-sunset" />{formatEventDate(event.startsAt, event.timezone)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-sunset" />Meet {formatEventTime(event.startsAt, event.timezone)}{event.endsAt ? ` – ${formatEventTime(event.endsAt, event.timezone)}` : ""}</span>
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
                  timezone: event.timezone,
                  startsAt: toZonedInputValue(event.startsAt, event.timezone),
                  endsAt: event.endsAt ? toZonedInputValue(event.endsAt, event.timezone) : null,
                  ksuAt: event.ksuAt ? toZonedInputValue(event.ksuAt, event.timezone) : null,
                  meetLocation: event.meetLocation,
                  meetAddress: event.meetAddress,
                  meetLat: event.meetLat,
                  meetLng: event.meetLng,
                  endLocation: event.endLocation,
                  endAddress: event.endAddress,
                  endLat: event.endLat,
                  endLng: event.endLng,
                  distanceMiles: event.distanceMiles,
                  difficulty: event.difficulty,
                  maxCapacity: event.maxCapacity,
                  rsvpDeadline: event.rsvpDeadline ? toZonedInputValue(event.rsvpDeadline, event.timezone) : null,
                  galleryClosesAt: event.galleryClosesAt ? toZonedInputValue(event.galleryClosesAt, event.timezone) : null,
                  crewId: event.crewId,
                  crewName: event.crew?.name ?? null,
                  photoUrl: flyerUrl ? mediaUrl(flyerUrl) : null,
                  hasPhoto: event.galleryItems.length > 0,
                  hasRoute: !!event.routeId,
                }}
                crews={manageableCrews}
              />
            )}
          </div>
        </header>

        {/* Organizer controls sit up top with the other manage actions, not in a
            card at the bottom of the page. */}
        {isOrganizer && event.status !== "CANCELLED" ? (
          <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Organizer
            </span>
            <Link
              href={`/events/${event.slug}/analytics`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
            >
              <BarChart3 className="h-4 w-4 text-sunset" />
              Analytics
            </Link>
            <MessageRidersDialog
              eventId={event.id}
              eventTitle={event.title}
              counts={messageAudienceCounts}
            />
            <EventRoutePlannerButton eventId={event.id} hasRoute={!!event.routeId} />
          </div>
        ) : null}

        {/* Content + sticky action rail. The rail is first in the DOM so a phone
            leads with the facts and the RSVP / check-in / Rider Down actions,
            before the flyer and the long stuff; on desktop it moves to the right
            and sticks while the main column scrolls. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
          <aside className="space-y-4 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start">
            {/* Live ride: the emergency lever comes first. */}
            {isActiveEvent ? safetyPanel : null}

            {/* The event's poster, above the details it summarises. A portrait
                flyer fills the rail's width instead of stranding text beside it. */}
            {flyerUrl ? (
               
              <img
                src={mediaUrl(flyerUrl)}
                alt={event.galleryItems[0].caption || `${event.title} flyer`}
                className="w-full rounded-xl border border-border shadow-soft"
              />
            ) : null}

            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <dl className="space-y-3.5">
                <DetailRow
                  icon={CalendarDays}
                  label="Date"
                  sub={
                    <>
                      Meetup at {formatEventTime(event.startsAt, event.timezone)}
                      {meetHint ? <span className="text-sunset"> · {meetHint}</span> : null}
                    </>
                  }
                >
                  {formatEventDate(event.startsAt, event.timezone)}
                </DetailRow>
                <DetailRow icon={Clock3} label="Kickstands up" sub={event.ksuAt ? formatEventDate(event.ksuAt, event.timezone) : "Time not set"}>
                  {event.ksuAt ? formatEventTime(event.ksuAt, event.timezone) : "TBD"}
                </DetailRow>
                <DetailRow
                  icon={MapPin}
                  label="Meetup"
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
                  {event.meetLocation || "TBD"}
                </DetailRow>
                {event.endLocation ? (
                  <DetailRow
                    icon={Flag}
                    label="Final destination"
                    sub={
                      <>
                        {event.endAddress ?? null}
                        {event.endLat != null && event.endLng != null ? (
                          <>
                            {event.endAddress ? " · " : null}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${event.endLat},${event.endLng}`}
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
                    {event.endLocation}
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
                <div className="flex items-center justify-center gap-2 pb-0.5 text-sm text-muted">
                  <UserCheck className="h-4 w-4 text-sunset" />
                  <span className="font-semibold text-ink">
                    {event.maxCapacity != null ? `${attendeeCount} / ${event.maxCapacity}` : attendeeCount}
                  </span>
                  <span>registered</span>
                  {waitlistCount > 0 && <span className="text-xs">· {waitlistCount} waitlisted</span>}
                </div>
                {/* Tracking is the soft "might go" — the label says what it buys
                    you, because "Track event" on its own told nobody anything. */}
                {currentUser ? (
                  <form action={toggleEventFollowAction.bind(null, event.id)}>
                    <button
                      type="submit"
                      title={
                        isTracking
                          ? "You'll be notified if the time or meetup point changes. Tap to stop."
                          : "Get notified if the time or meetup point changes. Doesn't hold you a spot."
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                        isTracking
                          ? "border-sunset/40 bg-sunset/10 text-sunset hover:border-sunset"
                          : "border-border text-asphalt hover:border-asphalt"
                      }`}
                    >
                      {isTracking ? "Tracking this ride" : "Track this ride"}
                    </button>
                    <p className="mt-1 text-center text-[0.65rem] leading-snug text-muted">
                      {isTracking
                        ? "We'll tell you if the time or meetup point changes."
                        : "Get told if plans change. Doesn't hold a spot — register for that."}
                    </p>
                  </form>
                ) : null}
                <EventRsvpButton
                  eventId={event.id}
                  currentRsvp={currentRsvp}
                  capacityFull={capacityFull}
                  rsvpClosed={rsvpClosed}
                  rsvpDeadline={event.rsvpDeadline ? formatEventDate(event.rsvpDeadline, event.timezone) : null}
                  isLoggedIn={!!currentUser}
                />
                {canCheckIn && (
                  <EventCheckInButton
                    eventId={event.id}
                    isCheckedIn={!!viewerCheckIn}
                    isCheckedOut={!!viewerCheckIn?.checkOutAt}
                  />
                )}
                {event.facebookEventUrl ? (
                  <a
                    href={event.facebookEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt transition hover:border-[#1877F2] hover:text-[#1877F2]"
                  >
                    <SiFacebook className="h-4 w-4" />
                    Facebook event
                  </a>
                ) : null}
                {event.status !== "CANCELLED" ? (
                  <a
                    href={`/api/events/${event.slug}/calendar.ics`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt transition hover:border-sunset/50 hover:text-sunset"
                  >
                    <CalendarPlus className="h-4 w-4 text-sunset" />
                    Add to calendar
                  </a>
                ) : null}
                <p className="pt-1 text-center text-xs text-muted">
                  {attendeeCount} going · {trackedCount} tracking
                </p>
              </div>
            </div>

            {/* The going list, compact — five faces and a Show all, not a wall. */}
            <EventRidersList
              riders={event.rsvps.map((rsvp) => ({
                handle: rsvp.rider.handle,
                name: rsvp.rider.name,
                avatarUrl: rsvp.rider.avatarUrl ? mediaUrl(rsvp.rider.avatarUrl) : null,
              }))}
            />
          </aside>

          {/* MAIN column */}
          <div className="space-y-6 lg:col-start-1 lg:row-start-1">
            {/* Post-ride recap — a completed ride leads with how it went. */}
            {event.status === "COMPLETED" ? (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-sunset" />
                  <h2 className="font-display text-xl text-asphalt">Ride recap</h2>
                </div>
                <p className="mt-1 text-sm text-muted">This one&apos;s in the books.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { v: event.checkIns.length, l: event.checkIns.length === 1 ? "rider rode" : "riders rode" },
                    ...(event.distanceMiles ? [{ v: event.distanceMiles, l: "miles" }] : []),
                    { v: galleryRows.length, l: galleryRows.length === 1 ? "photo" : "photos" },
                  ].map((s) => (
                    <div key={s.l} className="min-w-20 flex-1 rounded-lg bg-canvas p-3 text-center">
                      <p className="font-display text-2xl text-ink">{s.v}</p>
                      <p className="text-xs text-muted">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {/* The flyer is a portrait poster and lives in the rail, where a tall
                image fills the column instead of stranding text beside it. The
                main column leads with the write-up. */}
            {aboutCard}

        {/* FULL-WIDTH ROUTE MAP */}
        {coordinates.length >= 2 ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-asphalt">
                  {showLiveMap ? "Live Ride" : "Official Route"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {showLiveMap
                    ? "Riders sharing their location during the ride."
                    : "Saved route attached to this event."}
                </p>
              </div>
              <RouteExportOptions
                coordinates={coordinates}
                waypoints={waypoints}
                eventTitle={event.title}
              />
            </div>
            <div className="mt-4">
              {showLiveMap ? (
                <LiveRideMap
                  eventId={event.id}
                  coordinates={coordinates}
                  waypoints={waypoints}
                  canShare={canShareLive}
                  className="h-120 w-full"
                />
              ) : (
                <RouteMap coordinates={coordinates} waypoints={waypoints} className="h-120 w-full" />
              )}
            </div>

            {(eventClimb || waypoints.length > 0 || event.routeId) && (
              <div className="mt-5 grid gap-x-8 gap-y-6 border-t border-border pt-4 md:grid-cols-2">
                {/* Left: difficulty + turn-by-turn stops */}
                <div className="space-y-4">
                  {eventClimb && (
                    <div className="rounded-lg border border-border bg-canvas p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset">
                        <Signal className="h-3.5 w-3.5" />Difficulty
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-ink">{eventClimb.label}</p>
                      <p className="text-xs text-muted">
                        {eventElevationGainFt!.toLocaleString("en-US")} ft climb over {event.distanceMiles} mi
                      </p>
                    </div>
                  )}
                  {waypoints.length > 0 && <RouteStops waypoints={waypoints} />}
                </div>

                {/* Right: rider-flagged hazards */}
                {event.routeId && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-asphalt">
                        Hazards on this route
                      </h3>
                      {currentUser ? (
                        <ReportHazardDialog
                          routeId={event.routeId}
                          coordinates={coordinates}
                          hazards={eventHazardPins}
                          defaultPoint={hazardDefaultPoint}
                        />
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <HazardList hazards={eventHazardListItems} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : event.meetLat != null && event.meetLng != null ? (
          // No saved route — show the meetup on a map anyway, so every event has
          // one and the page keeps its shape.
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <div>
              <h2 className="font-display text-xl text-asphalt">Meetup Location</h2>
              <p className="mt-1 text-sm text-muted">{event.meetLocation ?? "Where the ride gathers."}</p>
            </div>
            <div className="mt-4">
              <RouteMap
                coordinates={[[event.meetLng, event.meetLat]]}
                waypoints={[
                  {
                    id: "meetup",
                    lng: event.meetLng,
                    lat: event.meetLat,
                    label: event.meetLocation ?? "Meetup",
                    kind: "START",
                  },
                ]}
                className="h-96 w-full"
              />
            </div>
          </div>
        ) : null}

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

            {/* Post-ride recap — completed events only */}
            {event.status === "COMPLETED" && (
              <EventRecap
                title={event.title}
                riders={event.checkIns.length}
                miles={event.distanceMiles}
                photos={eventPhotos.length}
                hasRoute={!!event.routeId}
                coverUrl={event.galleryItems[0]?.url ?? eventPhotos[0]?.url ?? null}
              />
            )}

            {/* Community photo gallery — attendees contribute, anyone can view */}
            <EventGallery
              eventId={event.id}
              photos={eventPhotos}
              canUpload={Boolean(viewerRider) && isGalleryOpen(event)}
              closed={!isGalleryOpen(event)}
            />

            {/* Attendance — organizers, during or after the ride */}
            {isOrganizer && (isActiveEvent || hasStarted || event.status === "COMPLETED") && attendeesForPanel.length > 0 && (
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
    </AppShell>
  );
}
