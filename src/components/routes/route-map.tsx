"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { useRouteMap } from "@/hooks/use-route-map";
import { useWaypointMarkers } from "@/hooks/use-waypoint-markers";
import type { PlannerWaypoint } from "@/lib/routing";

type RouteMapProps = {
  // Saved route geometry: GeoJSON LineString coordinates [lng, lat][].
  coordinates: [number, number][];
  waypoints?: PlannerWaypoint[];
  interactive?: boolean;
  className?: string;
};

/**
 * Read-only renderer for a saved route. Drop this on event detail pages,
 * featured roads, or rider profiles to display a planned route + waypoints.
 */
export function RouteMap({
  coordinates,
  waypoints = [],
  interactive = false,
  className = "h-96 w-full",
}: RouteMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const { containerRef, mapRef, mapReady, setRouteLine, fitToCoordinates } = useRouteMap({
    token,
    interactive,
  });

  useWaypointMarkers({ mapRef, mapReady, waypoints });

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    setRouteLine(coordinates);
    if (coordinates.length > 0) {
      fitToCoordinates(coordinates);
    }
    // setRouteLine/fitToCoordinates are stable map helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, coordinates]);

  if (!token) {
    return (
      <div className={`grid place-items-center rounded-2xl border border-border bg-surface ${className}`}>
        <div className="text-center">
          <MapPin className="mx-auto h-6 w-6 text-sunset" />
          <p className="mt-2 text-sm text-muted">Map unavailable (missing MapTiler key).</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={`overflow-hidden rounded-2xl ${className}`} />;
}
