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

function haversineMiles(a: [number, number], b: [number, number]): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRadians(b[0] - a[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceMilesFromGeometry(coordinates: [number, number][]): number | null {
  if (coordinates.length < 2) {
    return null;
  }

  let distance = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    distance += haversineMiles(coordinates[index - 1], coordinates[index]);
  }

  return Number.isFinite(distance) && distance > 0 ? distance : null;
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

// Without an explicit `types`, MapTiler does not search points of interest at
// all — only addresses and place names. That made every business unfindable:
// searching a gas station returned street names in other states, or nothing.
// `municipality` is here so typing a city still returns the city; with only
// `poi` in the list, "Nashville" resolves to Nashville Christian School.
const GEOCODE_TYPES = "poi,address,place,municipality";

// MapTiler bridges punctuation and small typos on its own — "Bucees" finds
// Buc-ee's, "Wafle House" finds Waffle House. What it cannot bridge is a brand
// whose real name drops a letter, because the plausible misspelling is itself a
// real POI name somewhere: "Quick Trip" matches stores in Kentucky and Missouri
// exactly, and an exact match anywhere on earth outranks a fuzzy match next
// door. Verified that no request shape fixes this — a bounding box containing
// only Clarksville still returns Quick Stop and Quick Print rather than the
// QuikTrip that is provably inside it.
//
// So these get normalized before the request. Add a brand here only when its
// real spelling is genuinely irregular; ordinary typos need no help.
const IRREGULARLY_SPELLED_BRANDS = ["QuikTrip"];

/** Lowercase and drop everything that isn't a letter or digit. */
function normalizeForBrandMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }

  return prev[b.length];
}

// Rewrites a leading brand name to its real spelling, leaving any trailing words
// alone — "quick trip rossview" searches as "QuikTrip rossview". Longest match
// wins, so a city that follows the brand can't be swallowed into the comparison.
function canonicalizeBrand(query: string): string {
  const words = query.split(/\s+/).filter(Boolean);

  for (let take = words.length; take >= 1; take--) {
    const head = normalizeForBrandMatch(words.slice(0, take).join(""));
    // Short heads collide too easily to risk rewriting.
    if (head.length < 5) continue;

    for (const brand of IRREGULARLY_SPELLED_BRANDS) {
      if (editDistance(head, normalizeForBrandMatch(brand)) <= 1) {
        return [brand, ...words.slice(take)].join(" ");
      }
    }
  }

  return query;
}

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

/**
 * Forward geocode an address/place query into ranked location results.
 *
 * `near` biases results toward a point — it ranks, it does not restrict, so a
 * genuinely distant match still surfaces. Defaults to Clarksville.
 */
export async function geocodeAddress(
  query: string,
  token: string,
  signal?: AbortSignal,
  near?: LngLat,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const proximity = near ? `${near.lng},${near.lat}` : CLARKSVILLE_PROXIMITY;
  const searchFor = canonicalizeBrand(trimmed);

  const url =
    `${GEOCODE_BASE}/${encodeURIComponent(searchFor)}.json` +
    `?key=${token}&autocomplete=true&limit=5&proximity=${proximity}&types=${GEOCODE_TYPES}`;

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

