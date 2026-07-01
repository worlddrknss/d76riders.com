// Free road-routing via the public OSRM demo server (no API key).
// OSRM snaps an ordered list of waypoints to the road network and returns the
// route geometry plus distance/duration. The demo server is rate-limited and
// meant for development/playgrounds, not production traffic.

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export type LngLat = {
  lng: number;
  lat: number;
};

export type WaypointKind = "START" | "KSU" | "FUEL" | "FOOD" | "REST" | "STOP" | "END";

export type PlannerWaypoint = LngLat & {
  id: string;
  label?: string;
  kind: WaypointKind;
};

export type RouteResult = {
  // GeoJSON LineString coordinates: [lng, lat][]
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

type OsrmResponse = {
  code: string;
  routes?: {
    geometry: { coordinates: [number, number][]; type: "LineString" };
    distance: number;
    duration: number;
  }[];
};

/**
 * Snap the given ordered waypoints to roads and return the driving route.
 * Returns null when there are fewer than two points or OSRM finds no route.
 */
export async function fetchRoute(
  points: LngLat[],
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  if (points.length < 2) {
    return null;
  }

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status}`);
  }

  const data: OsrmResponse = await res.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) {
    return null;
  }

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function formatDistance(meters: number): string {
  return `${metersToMiles(meters).toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${minutes}m`;
}

type Point2D = { x: number; y: number };

function toProjectedMeters(coordinates: [number, number][]): Point2D[] {
  if (coordinates.length === 0) {
    return [];
  }
  const meanLat = coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length;
  const metersPerDegLat = 110_540;
  const metersPerDegLng = 111_320 * Math.cos((meanLat * Math.PI) / 180);
  return coordinates.map(([lng, lat]) => ({ x: lng * metersPerDegLng, y: lat * metersPerDegLat }));
}

function distanceToSegmentSquared(point: Point2D, start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    const sx = point.x - start.x;
    const sy = point.y - start.y;
    return sx * sx + sy * sy;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
  );
  const px = start.x + t * dx;
  const py = start.y + t * dy;
  const ex = point.x - px;
  const ey = point.y - py;
  return ex * ex + ey * ey;
}

/**
 * Simplify a route line while preserving start/end shape using Douglas-Peucker.
 * Tolerance is in meters; use 0 to keep the original geometry.
 */
export function simplifyRouteGeometry(
  coordinates: [number, number][],
  toleranceMeters: number,
): [number, number][] {
  if (coordinates.length <= 2 || toleranceMeters <= 0) {
    return coordinates;
  }

  const projected = toProjectedMeters(coordinates);
  const keep = new Array(coordinates.length).fill(false);
  keep[0] = true;
  keep[coordinates.length - 1] = true;
  const toleranceSquared = toleranceMeters * toleranceMeters;

  const stack: Array<[number, number]> = [[0, coordinates.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistance = 0;
    let maxIndex = -1;

    for (let i = first + 1; i < last; i += 1) {
      const dist = distanceToSegmentSquared(projected[i], projected[first], projected[last]);
      if (dist > maxDistance) {
        maxDistance = dist;
        maxIndex = i;
      }
    }

    if (maxIndex !== -1 && maxDistance > toleranceSquared) {
      keep[maxIndex] = true;
      stack.push([first, maxIndex], [maxIndex, last]);
    }
  }

  const simplified: [number, number][] = [];
  for (let i = 0; i < coordinates.length; i += 1) {
    if (keep[i]) {
      simplified.push(coordinates[i]);
    }
  }

  return simplified.length >= 2 ? simplified : [coordinates[0], coordinates[coordinates.length - 1]];
}

// --- Geocoding (MapTiler, same key as the basemap) ---------------------------

const GEOCODE_BASE = "https://api.maptiler.com/geocoding";

// Bias results toward Middle Tennessee so local searches rank first.
const CLARKSVILLE_PROXIMITY = "-87.3595,36.5298";

export type GeocodeResult = LngLat & {
  id: string;
  name: string;
  context: string;
};

type MapTilerFeature = {
  id: string;
  text?: string;
  place_name?: string;
  center: [number, number];
};

type MapTilerResponse = {
  features?: MapTilerFeature[];
};

function toGeocodeResult(feature: MapTilerFeature): GeocodeResult {
  const [lng, lat] = feature.center;
  const full = feature.place_name ?? feature.text ?? "";
  const name = feature.text ?? full;
  // Trailing context after the primary name (city, state, etc.).
  const context = full.startsWith(name) ? full.slice(name.length).replace(/^,\s*/, "") : full;
  return { id: feature.id, name, context, lng, lat };
}

/** Forward geocode an address/place query into ranked location results. */
export async function geocodeAddress(
  query: string,
  token: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const url =
    `${GEOCODE_BASE}/${encodeURIComponent(trimmed)}.json` +
    `?key=${token}&autocomplete=true&limit=5&proximity=${CLARKSVILLE_PROXIMITY}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data: MapTilerResponse = await res.json();
  return (data.features ?? []).map(toGeocodeResult);
}

/** Reverse geocode a coordinate into a human-readable label. */
export async function reverseGeocode(
  point: LngLat,
  token: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `${GEOCODE_BASE}/${point.lng},${point.lat}.json?key=${token}&limit=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    return null;
  }
  const data: MapTilerResponse = await res.json();
  const feature = data.features?.[0];
  return feature?.place_name ?? feature?.text ?? null;
}

