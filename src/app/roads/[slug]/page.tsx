import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Route as RouteIcon, Signal, Star } from "lucide-react";

import { deleteRoadAction, updateRoadAction } from "@/app/roads/actions";
import { RoutePlannerField } from "@/components/routes/route-planner-field";
import { RouteMap } from "@/components/routes/route-map";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";
import type { PlannerWaypoint, WaypointKind } from "@/lib/routing";

function difficultyLabel(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "Not specified";
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
        <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Featured Road</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{road.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">{road.description || "No road description yet."}</p>
            </div>
            <Link href="/roads" className="text-sm font-semibold text-sunset hover:underline">Back to roads</Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4 text-sunset" />{road.distanceMiles ? `${road.distanceMiles} miles` : "Distance TBD"}</span>
            <span className="inline-flex items-center gap-2"><Signal className="h-4 w-4 text-sunset" />{difficultyLabel(road.difficulty)}</span>
            <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-sunset" />{road.scenicRating ? road.scenicRating.toFixed(1) : "N/A"}</span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />Shared by {road.rider.name} (@{road.rider.handle})</span>
          </div>
        </div>

        {road.galleryItems[0]?.url ? <img src={mediaUrl(road.galleryItems[0].url)} alt={road.galleryItems[0].caption || road.name} className="h-96 w-full rounded-xl object-cover shadow-soft" /> : null}

        {coordinates.length >= 2 ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
            <h2 className="font-display text-xl font-semibold text-asphalt">Saved Road Route</h2>
            <div className="mt-4">
              <RouteMap coordinates={coordinates} waypoints={waypoints} className="h-120 w-full" />
            </div>
          </div>
        ) : null}

        {isOwner ? (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="font-display text-xl font-semibold text-asphalt">Manage Road</h2>
            <form action={updateRoadAction.bind(null, road.id)} className="mt-4 space-y-4">
              <input name="name" defaultValue={road.name} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" />
              <textarea name="description" rows={4} defaultValue={road.description ?? ""} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" />
              <div className="grid gap-4 md:grid-cols-2">
                <select name="difficulty" defaultValue={road.difficulty ?? ""} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                  <option value="">Not specified</option>
                  <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="SCENIC">Scenic</option>
                </select>
                <input name="scenicRating" type="number" step="0.1" min={0} max={5} defaultValue={road.scenicRating ?? undefined} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" />
              </div>
              <input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
              <label className="flex items-center gap-2 text-xs text-muted"><input name="removeCoverImage" type="checkbox" /> Remove current road image</label>
              <input name="routeName" defaultValue={road.route?.name ?? ""} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" placeholder="Route name" />
              <textarea name="routeDescription" rows={3} defaultValue={road.route?.description ?? ""} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" placeholder="Route description" />
              <RoutePlannerField
                title="Featured Road Route Planner"
                helperText="Launch full-screen planner to replace or attach the saved road route."
                savedSummaryLabel="Saved road route"
                modalEyebrow="Featured Road Builder"
                modalTitle="Featured Road Route Planner"
                hiddenGeometryName="routeGeometryJson"
                hiddenWaypointsName="routeWaypointsJson"
                hiddenDistanceName="routeDistanceMiles"
              />
              <div className="flex flex-wrap gap-4 text-xs text-muted">
                <label className="flex items-center gap-2"><input name="removeRoute" type="checkbox" /> Remove saved route</label>
              </div>
              <div className="flex gap-2">
                <button className="rounded-md bg-asphalt px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white">Save Road</button>
                <button formAction={deleteRoadAction.bind(null, road.id)} className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-red-700">Delete Road</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
