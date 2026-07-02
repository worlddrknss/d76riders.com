import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Mountain, Route as RouteIcon, Signal, Star, UserRound } from "lucide-react";

import { RoadManageActions } from "@/components/roads/road-manage-actions";
import { StarRating } from "@/components/roads/star-rating";
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

function extractCoordinates(value: unknown): [number, number][] {
  if (!value || typeof value !== "object" || !("coordinates" in value)) return [];
  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return [];
  return coordinates.filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number");
}

export default async function RoadDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const road = await prisma.road.findUnique({
    where: { slug },
    include: {
      rider: { select: { userId: true, handle: true, name: true } },
      route: { include: { waypoints: { orderBy: { order: "asc" } } } },
      galleryItems: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!road) notFound();

  // Fetch community rating aggregate + current user's rating
  const ratingAggregate = await prisma.roadRating.aggregate({
    where: { roadId: road.id },
    _avg: { score: true },
    _count: { score: true },
  });

  let userRating: number | null = null;
  if (currentUser) {
    const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
    if (rider) {
      const existing = await prisma.roadRating.findUnique({
        where: { roadId_riderId: { roadId: road.id, riderId: rider.id } },
        select: { score: true },
      });
      userRating = existing?.score ?? null;
    }
  }

  const averageRating = ratingAggregate._avg.score ?? road.scenicRating;
  const totalRatings = ratingAggregate._count.score;

  const coordinates = extractCoordinates(road.route?.geometry);
  const waypoints: PlannerWaypoint[] = (road.route?.waypoints ?? []).map((waypoint) => ({
    id: waypoint.id,
    lng: waypoint.lng,
    lat: waypoint.lat,
    label: waypoint.label ?? undefined,
    kind: waypoint.type as WaypointKind,
  }));

  const isOwner = currentUser?.id === road.rider.userId;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
          <Link href="/" className="text-muted transition hover:text-sunset">Home</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <Link href="/roads" className="text-muted transition hover:text-sunset">Roads</Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="text-asphalt">{road.name}</span>
        </nav>

        {/* TWO-COLUMN: Details | Cover Image */}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_24rem]">
          {/* ROAD DETAILS */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            {/* HEADER: Title + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-semibold text-ink">{road.name}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">{road.description || "No road description yet."}</p>
              </div>
              {isOwner && (
                <div className="flex shrink-0 items-center gap-1">
                  <RoadManageActions
                    road={{
                      id: road.id,
                      name: road.name,
                      description: road.description,
                      difficulty: road.difficulty,
                      scenicRating: road.scenicRating,
                      hasImage: !!road.galleryItems[0]?.url,
                      hasRoute: !!road.route,
                      routeName: road.route?.name ?? null,
                      routeDescription: road.route?.description ?? null,
                    }}
                  />
                </div>
              )}
            </div>

            {/* INFO CARDS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><RouteIcon className="h-3.5 w-3.5" />Distance</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{road.distanceMiles ? `${road.distanceMiles} miles` : "TBD"}</p>
                <p className="text-xs text-muted">Total route length</p>
              </div>
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><Signal className="h-3.5 w-3.5" />Difficulty</div>
                <p className="mt-1.5 text-sm font-medium text-ink">{difficultyLabel(road.difficulty)}</p>
                <p className="text-xs text-muted">Skill level</p>
              </div>
              <StarRating
                roadId={road.id}
                initialAverage={averageRating}
                initialTotal={totalRatings}
                initialUserRating={userRating}
                isAuthenticated={!!currentUser}
              />
              <div className="rounded-lg border border-border bg-canvas p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset"><Mountain className="h-3.5 w-3.5" />Type</div>
                <p className="mt-1.5 text-sm font-medium text-ink">Featured Road</p>
                <p className="text-xs text-muted">Community curated</p>
              </div>
            </div>

            {/* FOOTER: Shared by */}
            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-5 text-sm text-muted">
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Shared by: <Link href={`/riders/${road.rider.handle}`} className="font-medium text-ink hover:text-sunset">{road.rider.name}</Link></span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />@{road.rider.handle}</span>
            </div>
          </div>

          {/* COVER IMAGE */}
          {road.galleryItems[0]?.url ? (
            <div className="relative overflow-hidden rounded-xl border border-border shadow-soft lg:self-stretch">
              <img
                src={mediaUrl(road.galleryItems[0].url)}
                alt={road.galleryItems[0].caption || road.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* FULL-WIDTH ROUTE MAP */}
        {coordinates.length >= 2 ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-asphalt">Saved Road Route</h2>
              <p className="mt-1 text-sm text-muted">Route geometry attached to this featured road.</p>
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
