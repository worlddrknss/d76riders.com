import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Mountain, Route as RouteIcon, Signal, UserRound } from "lucide-react";

import { HazardList } from "@/components/hazards/hazard-list";
import { HazardMap } from "@/components/hazards/hazard-map";
import { ReportHazardDialog } from "@/components/hazards/report-hazard-dialog";
import { RoadManageActions } from "@/components/roads/road-manage-actions";
import { StarRating } from "@/components/roads/star-rating";
import { JsonLd, roadJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { activeHazardWhere } from "@/lib/hazards";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";
import type { PlannerWaypoint, WaypointKind } from "@/lib/routing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const road = await prisma.road.findUnique({
    where: { slug },
    select: { name: true, description: true, difficulty: true, distanceMiles: true, scenicRating: true, galleryItems: { take: 1, select: { url: true } } },
  });
  if (!road) return { title: "Road Not Found" };

  const description = road.description
    ? road.description.slice(0, 160)
    : `Explore ${road.name}${road.distanceMiles ? ` — a ${road.distanceMiles}-mile` : " — a"} scenic motorcycle road rated by the District 76 community.`;

  return {
    title: road.name,
    description,
    alternates: { canonical: `/roads/${slug}` },
    openGraph: {
      title: `${road.name} — Scenic Road`,
      description,
      type: "article",
      ...(road.galleryItems[0]?.url && { images: [{ url: mediaUrl(road.galleryItems[0].url) }] }),
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

  let viewerRiderId: string | null = null;
  let userRating: number | null = null;
  if (currentUser) {
    const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
    if (rider) {
      viewerRiderId = rider.id;
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
  const isAdmin = currentUser?.roles?.includes("ADMINISTRATOR") ?? false;

  // Active hazards on this road, newest first. Hazards only make sense on a
  // mapped road, so this whole surface is gated on the route having geometry.
  const hasMap = coordinates.length >= 2;
  const activeHazards = hasMap
    ? await prisma.hazardReport.findMany({
        where: { roadId: road.id, ...activeHazardWhere() },
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

  const hazardPins = activeHazards.map((h) => ({ id: h.id, type: h.type, lat: h.lat, lng: h.lng }));
  const hazardListItems = activeHazards.map((h) => ({
    id: h.id,
    type: h.type,
    description: h.description,
    createdAt: h.createdAt.toISOString(),
    reporterName: h.rider.name,
    reporterHandle: h.rider.handle,
    canClear: isAdmin || isOwner || h.riderId === viewerRiderId,
  }));

  // A hazard needs a location even before the rider taps. Default to the route's
  // KSU, else the middle of the line.
  const defaultPoint =
    road.route?.ksuLat != null && road.route?.ksuLng != null
      ? { lat: road.route.ksuLat, lng: road.route.ksuLng }
      : coordinates.length > 0
        ? { lat: coordinates[Math.floor(coordinates.length / 2)][1], lng: coordinates[Math.floor(coordinates.length / 2)][0] }
        : { lat: 36.5298, lng: -87.3595 };

  return (
    <section className="page-shell">
      <JsonLd data={roadJsonLd({
        name: road.name,
        slug: road.slug,
        description: road.description,
        distanceMiles: road.distanceMiles,
        scenicRating: averageRating,
        totalRatings,
        imageUrl: road.galleryItems[0]?.url ? mediaUrl(road.galleryItems[0].url) : undefined,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", href: "/" },
        { name: "Roads", href: "/roads" },
        { name: road.name, href: `/roads/${road.slug}` },
      ])} />
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
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Shared by: <Link href={`/r/${road.rider.handle}`} className="font-medium text-ink hover:text-sunset">{road.rider.name}</Link></span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />@{road.rider.handle}</span>
            </div>
          </div>

          {/* COVER IMAGE */}
          {road.galleryItems[0]?.url ? (
            <div className="relative overflow-hidden rounded-xl border border-border shadow-soft lg:self-stretch">
              <Image
                src={mediaUrl(road.galleryItems[0].url)}
                alt={road.galleryItems[0].caption || road.name}
                width={480}
                height={640}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* FULL-WIDTH ROUTE MAP + HAZARDS */}
        {hasMap ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-asphalt">Saved Road Route</h2>
                <p className="mt-1 text-sm text-muted">
                  {activeHazards.length > 0
                    ? `${activeHazards.length} active ${activeHazards.length === 1 ? "hazard" : "hazards"} flagged by riders.`
                    : "Route geometry attached to this featured road."}
                </p>
              </div>
              {currentUser ? (
                <ReportHazardDialog
                  roadId={road.id}
                  coordinates={coordinates}
                  hazards={hazardPins}
                  defaultPoint={defaultPoint}
                />
              ) : null}
            </div>
            <div className="mt-4">
              <HazardMap
                coordinates={coordinates}
                hazards={hazardPins}
                waypoints={waypoints}
                className="h-120 w-full"
              />
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt">
                Hazards on this road
              </h3>
              <div className="mt-3">
                <HazardList hazards={hazardListItems} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
