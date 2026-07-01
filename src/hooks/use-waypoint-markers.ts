"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { KIND_META, paintMarker } from "@/lib/map";
import type { PlannerWaypoint } from "@/lib/routing";

type UseWaypointMarkersOptions = {
  mapRef: React.RefObject<MapLibreMap | null>;
  mapReady: boolean;
  waypoints: PlannerWaypoint[];
  draggable?: boolean;
  onDragEnd?: (id: string, lng: number, lat: number) => void;
};

/**
 * Syncs MapLibre markers with the given waypoints. Markers are colored by kind
 * and (optionally) draggable. Shared by the editable planner and read-only map.
 */
export function useWaypointMarkers({
  mapRef,
  mapReady,
  waypoints,
  draggable = false,
  onDragEnd,
}: UseWaypointMarkersOptions) {
  const markersRef = useRef<Map<string, Marker>>(new Map());

  // Keep the latest drag handler without recreating markers.
  const dragRef = useRef(onDragEnd);
  useEffect(() => {
    dragRef.current = onDragEnd;
  }, [onDragEnd]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const existing = markersRef.current;
    const seen = new Set<string>();

    waypoints.forEach((wp) => {
      seen.add(wp.id);
      const color = KIND_META[wp.kind].color;
      let marker = existing.get(wp.id);

      if (!marker) {
        marker = new maplibregl.Marker({ color, draggable }).setLngLat([wp.lng, wp.lat]).addTo(map);

        if (draggable) {
          const created = marker;
          created.on("dragend", () => {
            const { lng, lat } = created.getLngLat();
            dragRef.current?.(wp.id, lng, lat);
          });
        }

        existing.set(wp.id, marker);
      } else {
        marker.setLngLat([wp.lng, wp.lat]);
        paintMarker(marker.getElement(), color);
      }
    });

    existing.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    });
  }, [waypoints, mapReady, draggable, mapRef]);

  // Clean up all markers on unmount.
  useEffect(() => {
    const existing = markersRef.current;
    return () => {
      existing.forEach((marker) => marker.remove());
      existing.clear();
    };
  }, []);
}
