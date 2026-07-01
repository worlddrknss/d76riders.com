import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Clock3, MapPin, Route as RouteIcon, Signal, UserRound } from "lucide-react";

import { EventManageActions } from "@/components/events/event-manage-actions";
import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { RouteExportOptions } from "@/components/events/route-export-options";
import { ShareEvent } from "@/components/events/share-event";
import { RouteMap } from "@/components/routes/route-map";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";
import type { PlannerWaypoint, WaypointKind } from "@/lib/routing";

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
        select: { riderId: true },
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

  const isOwner = currentUser?.id === event.host.userId;

  // Look up current user's rider to check RSVP status
  let currentRsvp: "GOING" | "INTERESTED" | null = null;
  if (currentUser) {
    const rider = await prisma.rider.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    });
    if (rider) {
      const existingRsvp = event.rsvps.find((r) => r.riderId === rider.id);
      if (existingRsvp) {
        currentRsvp = "GOING";
      }
    }
  }

  const attendeeCount = event.rsvps.length;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
          <Link href="/" className="text-muted transition hover:text-sunset">Home</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <Link href="/events" className="text-muted transition hover:text-sunset">Events</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="text-asphalt">{event.title}</span>
        </nav>

        {/* TWO-COLUMN: Details | Flyer */}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_24rem]">
          {/* EVENT DETAILS */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            {/* HEADER: Title + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-semibold text-ink">{event.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">{event.description || "No event description yet."}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ShareEvent title={event.title} slug={event.slug} />
                {isOwner && (
                  <EventManageActions
                    event={{
                      id: event.id,
                      title: event.title,
                      description: event.description,
                      startsAt: event.startsAt.toISOString(),
                      ksuAt: event.ksuAt ? event.ksuAt.toISOString() : null,
                      meetLocation: event.meetLocation,
                      ksuLocation: event.ksuLocation,
                      distanceMiles: event.distanceMiles,
                      difficulty: event.difficulty,
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
              </div>
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><MapPin className="h-3.5 w-3.5" />Location</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{event.meetLocation || event.ksuLocation || "TBD"}</p>
                <p className="text-xs text-muted">Meetup point</p>
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
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Host: <Link href={`/riders/${event.host.handle}`} className="font-medium text-ink hover:text-sunset">{event.host.name}</Link></span>
                <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4 text-sunset" />Distance: <span className="font-medium text-ink">{event.distanceMiles ? `${event.distanceMiles} mi` : "TBD"}</span></span>
              </div>
              <EventRsvpButton
                eventId={event.id}
                currentRsvp={currentRsvp}
                attendeeCount={attendeeCount}
                isLoggedIn={!!currentUser}
              />
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
      </div>
    </section>
  );
}
