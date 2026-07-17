"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { MapPin } from "lucide-react";

import { useRouteMap } from "@/hooks/use-route-map";
import { useWaypointMarkers } from "@/hooks/use-waypoint-markers";
import { HAZARD_META } from "@/lib/hazards";
import type { PlannerWaypoint } from "@/lib/routing";
import type { HazardType } from "@prisma/client";

export type HazardPin = {
  id: string;
  type: HazardType;
  lat: number;
  lng: number;
};

type HazardMapProps = {
  coordinates: [number, number][];
  hazards: HazardPin[];
  waypoints?: PlannerWaypoint[];
  className?: string;
  // Pick mode: tapping the map reports a location back through onPick, and the
  // provisional point is drawn as a distinct pin.
  pickMode?: boolean;
  pending?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
};

// A small round map marker in the hazard's colour, built in the DOM rather than
// an image so it themes with the palette and needs no asset.
function dot(color: string, ring: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.width = ring ? "18px" : "14px";
  el.style.height = ring ? "18px" : "14px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = ring
    ? `0 0 0 4px ${color}44, 0 1px 3px rgba(0,0,0,0.4)`
    : "0 1px 3px rgba(0,0,0,0.4)";
  el.style.cursor = "default";
  return el;
}

export function HazardMap({
  coordinates,
  hazards,
  waypoints = [],
  className = "h-96 w-full",
  pickMode = false,
  pending = null,
  onPick,
}: HazardMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const { containerRef, mapRef, mapReady, setRouteLine, fitToCoordinates } = useRouteMap({
    token,
    interactive: true,
    onMapClick: pickMode ? (lng, lat) => onPick?.(lat, lng) : undefined,
  });

  useWaypointMarkers({ mapRef, mapReady, waypoints });

  const hazardMarkers = useRef<maplibregl.Marker[]>([]);
  const pendingMarker = useRef<maplibregl.Marker | null>(null);

  // Draw the route line and frame it once the map is ready.
  useEffect(() => {
    if (!mapReady) return;
    setRouteLine(coordinates);
    if (coordinates.length > 0) fitToCoordinates(coordinates);
    // setRouteLine/fitToCoordinates are stable map helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, coordinates]);

  // Sync the hazard pins whenever the set changes.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    hazardMarkers.current.forEach((m) => m.remove());
    hazardMarkers.current = hazards.map((h) =>
      new maplibregl.Marker({ element: dot(HAZARD_META[h.type].color, false) })
        .setLngLat([h.lng, h.lat])
        .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(HAZARD_META[h.type].label))
        .addTo(map),
    );
    return () => {
      hazardMarkers.current.forEach((m) => m.remove());
      hazardMarkers.current = [];
    };
  }, [mapReady, mapRef, hazards]);

  // The provisional pin follows the last tap while reporting.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!pending) {
      pendingMarker.current?.remove();
      pendingMarker.current = null;
      return;
    }
    if (!pendingMarker.current) {
      pendingMarker.current = new maplibregl.Marker({ element: dot("#e8703a", true) });
    }
    pendingMarker.current.setLngLat([pending.lng, pending.lat]).addTo(map);
  }, [mapReady, mapRef, pending]);

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

  return (
    <div className="relative">
      <div ref={containerRef} className={`overflow-hidden rounded-2xl ${className}`} />
      {pickMode ? (
        <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-asphalt/90 px-3 py-1 text-xs font-medium text-white shadow-lift">
          {pending ? "Tap again to move the pin" : "Tap the map where the hazard is"}
        </p>
      ) : null}
    </div>
  );
}
