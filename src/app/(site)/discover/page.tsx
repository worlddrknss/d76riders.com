import { MapPin, UserRound } from "lucide-react";

import { RouteMap } from "@/components/routes/route-map";
import { prisma } from "@/lib/prisma";

function buildSquareCoordinates(centerLng: number, centerLat: number, radiusDegrees = 0.04): [number, number][] {
  return [
    [centerLng - radiusDegrees, centerLat - radiusDegrees],
    [centerLng + radiusDegrees, centerLat - radiusDegrees],
    [centerLng + radiusDegrees, centerLat + radiusDegrees],
    [centerLng - radiusDegrees, centerLat + radiusDegrees],
    [centerLng - radiusDegrees, centerLat - radiusDegrees],
  ];
}

export default async function DiscoverPage() {
  const roads = await prisma.road.findMany({
    where: { route: { isNot: null } },
    include: {
      rider: { select: { handle: true, name: true } },
      route: { select: { geometry: true, ksuLat: true, ksuLng: true } },
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  const riders = await prisma.rider.findMany({
    where: { location: { not: null } },
    select: { handle: true, name: true, location: true },
    take: 24,
    orderBy: { createdAt: "desc" },
  });

  const firstRoad = roads[0];
  const mapCoordinates = (() => {
    if (!firstRoad?.route) {
      return buildSquareCoordinates(-87.3595, 36.5298, 0.2);
    }

    const geometry = firstRoad.route.geometry;
    if (geometry && typeof geometry === "object" && "coordinates" in geometry && Array.isArray((geometry as { coordinates?: unknown }).coordinates)) {
      const coordinates = (geometry as { coordinates: unknown[] }).coordinates.filter(
        (point): point is [number, number] => Array.isArray(point) && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number",
      );
      if (coordinates.length >= 2) {
        return coordinates;
      }
    }

    if (typeof firstRoad.route.ksuLng === "number" && typeof firstRoad.route.ksuLat === "number") {
      return buildSquareCoordinates(firstRoad.route.ksuLng, firstRoad.route.ksuLat);
    }

    return buildSquareCoordinates(-87.3595, 36.5298, 0.2);
  })();

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Map Discovery</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Nearby Builders and Roads</h1>
          <p className="mt-2 text-sm text-muted">Explore roads and local builders by map context, then jump into profiles and routes.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3">
          <RouteMap coordinates={mapCoordinates} className="h-[26rem] w-full" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-asphalt">Featured Nearby Roads</h2>
            <div className="mt-3 space-y-2">
              {roads.length > 0 ? roads.map((road) => (
                <a key={road.id} href={`/roads/${road.slug}`} className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 hover:border-sunset/60">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{road.name}</span>
                    <span className="text-xs text-muted">by {road.rider.name}</span>
                  </span>
                  <MapPin className="h-4 w-4 text-sunset" />
                </a>
              )) : <p className="text-sm text-muted">No mapped roads yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-asphalt">Nearby Builders</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {riders.length > 0 ? riders.map((rider) => (
                <a key={rider.handle} href={`/r/${rider.handle}`} className="rounded-lg border border-border bg-canvas px-3 py-2 hover:border-sunset/60">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink"><UserRound className="h-3.5 w-3.5 text-sunset" />{rider.name}</span>
                  <span className="block text-xs text-muted">{rider.location}</span>
                </a>
              )) : <p className="text-sm text-muted">No rider locations shared yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
