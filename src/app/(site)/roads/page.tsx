import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import { Route as RouteIcon } from "lucide-react";

import { CreateRoadDialog } from "@/components/roads/create-road-dialog";
import { RoadCard } from "@/components/roads/road-card";
import { RoadFilters } from "@/components/roads/road-filters";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { prisma } from "@/lib/prisma";
import { haversineMiles } from "@/lib/routing";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Scenic Motorcycle Roads",
  description:
    "Discover the best motorcycle roads in Tennessee and beyond. Community-rated scenic routes, twisties, and cruising roads shared by District 76 Riders.",
  alternates: { canonical: "/roads" },
  openGraph: {
    images: OG_IMAGE,
    title: "Scenic Roads — District 76 Riders",
    description: "Community-rated motorcycle roads and scenic routes in Tennessee and beyond.",
  },
};


// A road's representative point for "near me": its route's KSU, else the first
// coordinate of the route geometry (GeoJSON LineString or Feature). Null when
// the road has no mappable route.
function roadPoint(route: { ksuLat: number | null; ksuLng: number | null; geometry: unknown } | null): [number, number] | null {
  if (!route) return null;
  if (route.ksuLat != null && route.ksuLng != null) return [route.ksuLng, route.ksuLat];
  const g = route.geometry as { coordinates?: unknown; geometry?: { coordinates?: unknown } } | null;
  const coords = (g?.coordinates ?? g?.geometry?.coordinates) as unknown;
  if (Array.isArray(coords) && Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
    return [coords[0][0] as number, coords[0][1] as number];
  }
  return null;
}

type RoadsPageProps = {
  searchParams: Promise<{ q?: string; difficulty?: string; sort?: string }>;
};

export default async function RoadsPage({ searchParams }: RoadsPageProps) {
  const { q, difficulty, sort } = await searchParams;
  const currentUser = await getCurrentUser();

  const viewer = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { name: true, handle: true, latitude: true, longitude: true } })
    : null;
  const viewerPoint: [number, number] | null =
    viewer?.latitude != null && viewer?.longitude != null ? [viewer.longitude, viewer.latitude] : null;
  const near = sort === "near" && Boolean(viewerPoint);

  const orderBy = sort === "newest"
    ? [{ createdAt: "desc" as const }]
    : sort === "distance"
      ? [{ distanceMiles: "desc" as const }]
      // Default: blended Route Quality first (roads without any rating sink to the
      // bottom), with the legacy scenic score and recency as tie-breakers.
      : [
          { qualityScore: { sort: "desc" as const, nulls: "last" as const } },
          { scenicRating: "desc" as const },
          { createdAt: "desc" as const },
        ];

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (difficulty) {
    where.difficulty = difficulty;
  }

  const roadRows = await prisma.road.findMany({
    where,
    include: {
      rider: { select: { handle: true, name: true } },
      galleryItems: { orderBy: { createdAt: "asc" }, take: 1 },
      route: { select: { ksuLat: true, ksuLng: true, geometry: true } },
    },
    orderBy,
  });

  // Attach distance from the viewer and, when sorting nearest, rank by it
  // (roads without a mappable route sort last).
  let roads = roadRows.map((road) => ({
    road,
    distance: viewerPoint ? (() => {
      const point = roadPoint(road.route);
      return point ? haversineMiles(viewerPoint, point) : null;
    })() : null,
  }));
  if (near) {
    roads = [...roads].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  return (
    <AppShell>
      <PageHeader
        icon={RouteIcon}
        title="Roads"
        subtitle="Discover the best roads in Tennessee and beyond. Community-shared routes with scenic ratings, difficulty levels, and saved GPS geometry."
        action={
          viewer ? <CreateRoadDialog riderName={viewer.name} riderHandle={viewer.handle} /> : undefined
        }
      />

      <div className="space-y-6">
          <RoadFilters canSortNear={Boolean(viewerPoint)} />

          {roads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <p className="text-sm text-muted">No roads found matching your filters.</p>
            </div>
          ) : (
            <StaggerList className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {roads.map(({ road, distance }) => (
                <StaggerItem key={road.id}>
                  <RoadCard
                    road={{
                      slug: road.slug,
                      name: road.name,
                      description: road.description,
                      distanceMiles: road.distanceMiles,
                      difficulty: road.difficulty,
                      qualityScore: road.qualityScore,
                      scenicRating: road.scenicRating,
                      imageUrl: road.galleryItems[0]?.url ?? null,
                      riderName: road.rider.name,
                      riderHandle: road.rider.handle,
                      distanceAway: distance,
                    }}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
      </div>
    </AppShell>
  );
}
