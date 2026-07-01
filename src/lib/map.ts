// Shared MapLibre constants and helpers used by both the editable RoutePlanner
// and the read-only RouteMap (event detail pages, featured roads, etc).

import type { FeatureCollection, Feature, LineString } from "geojson";
import type { WaypointKind } from "@/lib/routing";

// Clarksville, TN — the District 76 home base.
export const CLARKSVILLE: [number, number] = [-87.3595, 36.5298];

export const ROUTE_SOURCE = "planned-route";
export const ROUTE_LAYER = "planned-route-line";
export const ROUTE_CASING_LAYER = "planned-route-casing";

export const KIND_META: Record<WaypointKind, { label: string; color: string }> = {
  START: { label: "Start", color: "#3f8a4f" },
  KSU: { label: "KSU", color: "#e8703a" },
  FUEL: { label: "Fuel", color: "#2563eb" },
  FOOD: { label: "Food", color: "#9333ea" },
  REST: { label: "Rest", color: "#0891b2" },
  STOP: { label: "Stop", color: "#1c1c1c" },
  END: { label: "End", color: "#b91c1c" },
};

export function mapStyleUrl(token: string): string {
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${token}`;
}

export function lineFeature(coordinates: [number, number][]): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  };
}

export const EMPTY_LINE = lineFeature([]);

// Update the fill color on a MapLibre default marker's SVG.
export function paintMarker(element: HTMLElement, color: string) {
  const path = element.querySelector("svg path[fill]");
  if (path) {
    path.setAttribute("fill", color);
  }
}

// Bounding box for a set of coordinates, padded slightly for framing.
export function coordinatesBounds(
  coordinates: [number, number][],
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) {
    return null;
  }
  let minLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLng = coordinates[0][0];
  let maxLat = coordinates[0][1];
  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export type { FeatureCollection };
