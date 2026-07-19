"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { MapPin, Navigation, NavigationOff } from "lucide-react";

import {
  fetchLiveLocationsAction,
  stopSharingLocationAction,
  updateLiveLocationAction,
  type LivePosition,
} from "@/app/(site)/events/[slug]/live-actions";
import { useRouteMap } from "@/hooks/use-route-map";
import { useWaypointMarkers } from "@/hooks/use-waypoint-markers";
import type { PlannerWaypoint } from "@/lib/routing";

const POLL_MS = 15000;

type WakeLock = { release: () => Promise<void> };

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function buildMarkerElement(p: LivePosition): HTMLElement {
  const el = document.createElement("div");
  el.style.textAlign = "center";

  const dot = document.createElement("div");
  dot.style.cssText =
    "width:34px;height:34px;border-radius:9999px;border:2px solid #e2662f;margin:0 auto;background-color:#1c1c1c;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,.3)";
  if (p.avatarUrl) dot.style.backgroundImage = `url("${p.avatarUrl}")`;
  else dot.textContent = p.name.charAt(0);

  const label = document.createElement("div");
  label.textContent = firstName(p.name);
  label.style.cssText =
    "margin-top:2px;font-size:10px;font-weight:600;color:#111;background:rgba(255,255,255,.85);padding:0 4px;border-radius:4px;white-space:nowrap;display:inline-block";

  el.appendChild(dot);
  el.appendChild(label);
  return el;
}

export function LiveRideMap({
  eventId,
  coordinates,
  waypoints = [],
  canShare,
  className = "h-120 w-full",
}: {
  eventId: string;
  coordinates: [number, number][];
  waypoints?: PlannerWaypoint[];
  canShare: boolean;
  className?: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const { containerRef, mapRef, mapReady, setRouteLine, fitToCoordinates } = useRouteMap({ token, interactive: true });
  useWaypointMarkers({ mapRef, mapReady, waypoints });

  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  const watchRef = useRef<number | null>(null);
  const wakeRef = useRef<WakeLock | null>(null);

  // Draw the route once ready.
  useEffect(() => {
    if (!mapReady) return;
    setRouteLine(coordinates);
    if (coordinates.length > 0) fitToCoordinates(coordinates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, coordinates]);

  // Poll live positions.
  useEffect(() => {
    let alive = true;
    async function tick() {
      const rows = await fetchLiveLocationsAction(eventId);
      if (alive) setPositions(rows);
    }
    tick();
    const iv = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [eventId]);

  // Sync rider markers to the latest positions.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set<string>();
    for (const p of positions) {
      seen.add(p.riderId);
      const existing = markersRef.current.get(p.riderId);
      if (existing) {
        existing.setLngLat([p.lng, p.lat]);
      } else {
        const marker = new maplibregl.Marker({ element: buildMarkerElement(p) }).setLngLat([p.lng, p.lat]).addTo(map);
        markersRef.current.set(p.riderId, marker);
      }
    }
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [positions, mapReady, mapRef]);

  const startSharing = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device.");
      return;
    }
    setError(null);
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<WakeLock> } }).wakeLock;
      wakeRef.current = wl ? await wl.request("screen") : null;
    } catch {
      // Wake lock is a nice-to-have; ignore if unavailable.
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void updateLiveLocationAction(eventId, pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setError("Couldn't get your location — check the browser's location permission.");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    setSharing(true);
  }, [eventId]);

  const stopSharing = useCallback(async () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    try {
      await wakeRef.current?.release();
    } catch {
      // ignore
    }
    wakeRef.current = null;
    setSharing(false);
    await stopSharingLocationAction(eventId);
  }, [eventId]);

  // Clean up watch + wake lock on unmount.
  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      wakeRef.current?.release().catch(() => {});
    },
    [],
  );

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
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${positions.length > 0 ? "bg-forest" : "bg-muted"}`} />
          {positions.length} {positions.length === 1 ? "rider" : "riders"} on the road now
        </p>
        {canShare ? (
          <button
            type="button"
            onClick={sharing ? stopSharing : startSharing}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              sharing
                ? "border border-border bg-canvas text-ink hover:border-ink/30"
                : "bg-sunset text-white hover:bg-[#cf5a26]"
            }`}
          >
            {sharing ? <NavigationOff className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
            {sharing ? "Stop sharing" : "Share my location"}
          </button>
        ) : null}
      </div>

      <div ref={containerRef} className={`overflow-hidden rounded-2xl ${className}`} />

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {sharing ? (
        <p className="mt-1.5 text-xs text-muted">
          Sharing your location. Keep this page open with the screen on — mobile browsers pause location in the
          background.
        </p>
      ) : null}
    </div>
  );
}
