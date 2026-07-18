"use client";

import { Download, ExternalLink, Map, Navigation } from "lucide-react";
import { useCallback, useState } from "react";

import type { PlannerWaypoint } from "@/lib/routing";

type RouteExportOptionsProps = {
  coordinates: [number, number][];
  waypoints: PlannerWaypoint[];
  eventTitle: string;
};

function buildGoogleMapsUrl(waypoints: PlannerWaypoint[], coordinates: [number, number][]): string {
  // Google Maps Directions supports up to ~25 waypoints in URL
  // Format: /dir/lat1,lng1/lat2,lng2/...
  const points = waypoints.length >= 2 ? waypoints : coordinatesToPoints(coordinates);
  const coords = points.slice(0, 25).map((p) => `${p.lat},${p.lng}`);
  return `https://www.google.com/maps/dir/${coords.join("/")}`;
}

function buildAppleMapsUrl(waypoints: PlannerWaypoint[], coordinates: [number, number][]): string {
  // Apple Maps supports saddr (start) and daddr (destination) with waypoints
  const points = waypoints.length >= 2 ? waypoints : coordinatesToPoints(coordinates);
  if (points.length < 2) return "#";
  const start = points[0];
  const end = points[points.length - 1];
  const midpoints = points.slice(1, -1);

  // Apple Maps doesn't take waypoints via URL, so we link start → destination —
  // the best we can do without the MapKit JS SDK. `midpoints` is intentionally
  // unused for that reason.
  void midpoints;
  return `https://maps.apple.com/?saddr=${start.lat},${start.lng}&daddr=${end.lat},${end.lng}&dirflg=d`;
}

function buildWazeUrl(waypoints: PlannerWaypoint[], coordinates: [number, number][]): string {
  // Waze deep link navigates to the final destination
  const points = waypoints.length >= 2 ? waypoints : coordinatesToPoints(coordinates);
  const dest = points[points.length - 1];
  return `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`;
}

function coordinatesToPoints(coordinates: [number, number][]): { lng: number; lat: number }[] {
  if (coordinates.length <= 10) {
    return coordinates.map(([lng, lat]) => ({ lng, lat }));
  }
  // Sample evenly: first, last, and spread in between
  const result: { lng: number; lat: number }[] = [];
  const step = Math.floor(coordinates.length / 9);
  for (let i = 0; i < coordinates.length; i += step) {
    result.push({ lng: coordinates[i][0], lat: coordinates[i][1] });
    if (result.length >= 9) break;
  }
  const last = coordinates[coordinates.length - 1];
  result.push({ lng: last[0], lat: last[1] });
  return result;
}

function generateGpx(coordinates: [number, number][], waypoints: PlannerWaypoint[], title: string): string {
  const waypointXml = waypoints
    .map(
      (wp) =>
        `  <wpt lat="${wp.lat}" lon="${wp.lng}">\n    <name>${escapeXml(wp.label || wp.kind)}</name>\n    <type>${wp.kind}</type>\n  </wpt>`,
    )
    .join("\n");

  const trackPoints = coordinates
    .map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="District76Riders"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(title)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypointXml}
  <trk>
    <name>${escapeXml(title)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function RouteExportOptions({ coordinates, waypoints, eventTitle }: RouteExportOptionsProps) {
  const [open, setOpen] = useState(false);

  const handleGpxDownload = useCallback(() => {
    const gpx = generateGpx(coordinates, waypoints, eventTitle);
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [coordinates, waypoints, eventTitle]);

  const googleUrl = buildGoogleMapsUrl(waypoints, coordinates);
  const appleUrl = buildAppleMapsUrl(waypoints, coordinates);
  const wazeUrl = buildWazeUrl(waypoints, coordinates);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-asphalt shadow-soft transition hover:border-sunset hover:text-sunset"
      >
        <Navigation className="h-4 w-4" />
        Export Route
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Open in Navigation</p>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt transition hover:bg-canvas"
              onClick={() => setOpen(false)}
            >
              <Map className="h-4 w-4 text-sunset" />
              Google Maps
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted" />
            </a>
            <a
              href={appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt transition hover:bg-canvas"
              onClick={() => setOpen(false)}
            >
              <Map className="h-4 w-4 text-sunset" />
              Apple Maps
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted" />
            </a>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt transition hover:bg-canvas"
              onClick={() => setOpen(false)}
            >
              <Map className="h-4 w-4 text-sunset" />
              Waze
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted" />
            </a>

            <div className="my-1 border-t border-border" />
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Download for GPS</p>
            <button
              type="button"
              onClick={handleGpxDownload}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-asphalt transition hover:bg-canvas"
            >
              <Download className="h-4 w-4 text-sunset" />
              GPX File
              <span className="ml-auto text-xs text-muted">Garmin, Sena, etc.</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
