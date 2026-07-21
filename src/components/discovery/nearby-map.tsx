"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";

import { CLARKSVILLE, coordinatesBounds, mapStyleUrl } from "@/lib/map";

export type NearbyPoint = {
  id: string;
  kind: "event" | "road";
  label: string;
  sublabel?: string;
  href: string;
  lng: number;
  lat: number;
};

const KIND_COLOR: Record<NearbyPoint["kind"], string> = {
  event: "#e8703a", // sunset
  road: "#2f7d4f", // forest
};

/**
 * A read-only map of nearby points of interest — upcoming events and featured
 * roads — coloured by kind, each linking to its detail page. Centered on the
 * viewer's coordinates (or Clarksville when unknown) and framed to fit the pins.
 */
export function NearbyMap({
  center,
  points,
  className = "h-[28rem] w-full",
}: {
  center: [number, number] | null;
  points: NearbyPoint[];
  className?: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(token),
      center: center ?? CLARKSVILLE,
      zoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    const markerCoords: [number, number][] = [];

    // The viewer's own location — a neutral dot so the pins read relative to it.
    if (center) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#1c1c1c;border:3px solid #fff;box-shadow:0 0 0 3px rgba(28,28,28,.25)";
      new maplibregl.Marker({ element: el }).setLngLat(center).addTo(map);
      markerCoords.push(center);
    }

    for (const p of points) {
      const el = document.createElement("a");
      el.href = p.href;
      el.setAttribute("aria-label", p.label);
      el.style.cssText = `display:block;width:18px;height:18px;border-radius:9999px;background:${KIND_COLOR[p.kind]};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer`;
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<a href="${p.href}" style="text-decoration:none;color:#1c1c1c"><strong>${p.label}</strong>${p.sublabel ? `<br/><span style="color:#6b6b6b;font-size:12px">${p.sublabel}</span>` : ""}</a>`,
      );
      new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      markerCoords.push([p.lng, p.lat]);
    }

    map.on("load", () => {
      const bounds = coordinatesBounds(markerCoords);
      if (bounds) map.fitBounds(bounds, { padding: 70, maxZoom: 12, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Rebuild only when the token changes; center/points are captured on init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className={`${className} flex items-center justify-center rounded-xl border border-border bg-canvas text-sm text-muted`}>
        Map is unavailable.
      </div>
    );
  }

  return <div ref={containerRef} className={`${className} overflow-hidden rounded-xl border border-border`} />;
}
