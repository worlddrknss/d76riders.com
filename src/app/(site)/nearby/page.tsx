import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Route as RouteIcon } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { NearbyMap, type NearbyPoint } from "@/components/discovery/nearby-map";
import { DEFAULT_TIMEZONE, formatEventDate, startOfTodayUtc } from "@/lib/datetime";
import { PUBLIC_EVENT_STATUSES } from "@/lib/events";
import { haversineMiles } from "@/lib/routing";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Nearby",
  description: "Upcoming rides and featured roads near you, on a map.",
  alternates: { canonical: "/nearby" },
};

// A road's map point: its route's KSU, else the first coordinate of the route
// geometry. Null when the road has no mappable route.
function routePoint(route: { ksuLat: number | null; ksuLng: number | null; geometry: unknown } | null): [number, number] | null {
  if (!route) return null;
  if (route.ksuLat != null && route.ksuLng != null) return [route.ksuLng, route.ksuLat];
  const g = route.geometry as { coordinates?: unknown; geometry?: { coordinates?: unknown } } | null;
  const coords = (g?.coordinates ?? g?.geometry?.coordinates) as unknown;
  if (Array.isArray(coords) && Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
    return [coords[0][0] as number, coords[0][1] as number];
  }
  return null;
}

export default async function NearbyPage() {
  const currentUser = await getCurrentUser();
  const viewer = currentUser
    ? await prisma.rider.findUnique({
        where: { userId: currentUser.id },
        select: { latitude: true, longitude: true, timezone: true },
      })
    : null;
  const center: [number, number] | null =
    viewer?.latitude != null && viewer?.longitude != null ? [viewer.longitude, viewer.latitude] : null;
  const viewerTz = viewer?.timezone ?? DEFAULT_TIMEZONE;

  const [eventRows, roadRows] = await Promise.all([
    prisma.rideEvent.findMany({
      where: {
        status: { in: PUBLIC_EVENT_STATUSES },
        startsAt: { gte: startOfTodayUtc(viewerTz) },
        meetLat: { not: null },
        meetLng: { not: null },
      },
      orderBy: { startsAt: "asc" },
      take: 60,
      select: { id: true, title: true, slug: true, startsAt: true, timezone: true, meetLat: true, meetLng: true, meetLocation: true },
    }),
    prisma.road.findMany({
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        route: { select: { ksuLat: true, ksuLng: true, geometry: true } },
      },
    }),
  ]);

  const dist = (lng: number, lat: number): number | null => (center ? haversineMiles(center, [lng, lat]) : null);

  const eventItems = eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    lng: e.meetLng!,
    lat: e.meetLat!,
    dateLabel: formatEventDate(e.startsAt, e.timezone ?? DEFAULT_TIMEZONE),
    meetLocation: e.meetLocation,
    distance: dist(e.meetLng!, e.meetLat!),
  }));

  const roadItems = roadRows
    .map((r) => {
      const point = routePoint(r.route);
      if (!point) return null;
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        lng: point[0],
        lat: point[1],
        difficulty: r.difficulty,
        distance: dist(point[0], point[1]),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Nearest-first in the side lists when we know where the viewer is.
  if (center) {
    eventItems.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    roadItems.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  const points: NearbyPoint[] = [
    ...eventItems.map((e) => ({
      id: `e-${e.id}`,
      kind: "event" as const,
      label: e.title,
      sublabel: e.dateLabel,
      href: `/events/${e.slug}`,
      lng: e.lng,
      lat: e.lat,
    })),
    ...roadItems.map((r) => ({
      id: `r-${r.id}`,
      kind: "road" as const,
      label: r.name,
      sublabel: "Featured road",
      href: `/roads/${r.slug}`,
      lng: r.lng,
      lat: r.lat,
    })),
  ];

  return (
    <AppShell>
      <PageHeader
        icon={MapPin}
        title="Nearby"
        subtitle={
          center
            ? "Upcoming rides and featured roads near you, closest first."
            : "Upcoming rides and featured roads on the map. Set your location in your profile to sort by distance."
        }
      />

      <div className="space-y-6">
        {points.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted shadow-soft">
            Nothing mappable nearby yet. Check back as riders add events and roads.
          </div>
        ) : (
          <>
            <NearbyMap center={center} points={points} />

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sunset" />Events</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-forest" />Roads</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-tight text-ink">
                  <CalendarDays className="h-5 w-5 text-sunset" /> Rides near you
                </h2>
                <ul className="mt-3 space-y-2">
                  {eventItems.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border bg-canvas p-4 text-sm text-muted">No upcoming rides with a location yet.</li>
                  ) : (
                    eventItems.slice(0, 10).map((e) => (
                      <li key={e.id}>
                        <Link href={`/events/${e.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
                            <p className="truncate text-xs text-muted">{e.dateLabel}{e.meetLocation ? ` · ${e.meetLocation}` : ""}</p>
                          </div>
                          {e.distance != null ? <span className="shrink-0 text-xs font-semibold text-sunset">{Math.round(e.distance)} mi</span> : null}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section>
                <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-tight text-ink">
                  <RouteIcon className="h-5 w-5 text-forest" /> Roads near you
                </h2>
                <ul className="mt-3 space-y-2">
                  {roadItems.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border bg-canvas p-4 text-sm text-muted">No mappable roads yet.</li>
                  ) : (
                    roadItems.slice(0, 10).map((r) => (
                      <li key={r.id}>
                        <Link href={`/roads/${r.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                            <p className="truncate text-xs capitalize text-muted">{r.difficulty ? r.difficulty.replaceAll("_", " ").toLowerCase() : "Featured road"}</p>
                          </div>
                          {r.distance != null ? <span className="shrink-0 text-xs font-semibold text-sunset">{Math.round(r.distance)} mi</span> : null}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
