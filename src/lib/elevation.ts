// Elevation estimation for saved routes. We sample the geometry and ask an open
// elevation source for point elevations, then sum the positive deltas to get an
// approximate total climb. Best-effort: any failure returns null (the route just
// won't show a difficulty), and it runs OUTSIDE the DB transaction so a slow API
// never holds a transaction open.

const SAMPLE_POINTS = 60;
const TIMEOUT_MS = 8000;
const METERS_TO_FEET = 3.28084;

/** Estimate total climb (feet) for a [lng,lat][] route. Null on any failure. */
export async function computeElevationGainFt(coordinates: [number, number][]): Promise<number | null> {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  // Evenly sample up to SAMPLE_POINTS, always keeping the last point.
  const step = Math.max(1, Math.floor(coordinates.length / SAMPLE_POINTS));
  const sampled: [number, number][] = [];
  for (let i = 0; i < coordinates.length; i += step) sampled.push(coordinates[i]);
  const last = coordinates[coordinates.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  const locations = sampled.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locations }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as { results?: { elevation: number }[] };
    const elevations = (data.results ?? [])
      .map((r) => r.elevation)
      .filter((e): e is number => typeof e === "number");
    if (elevations.length < 2) return null;

    let gainMeters = 0;
    for (let i = 1; i < elevations.length; i += 1) {
      const delta = elevations[i] - elevations[i - 1];
      if (delta > 0) gainMeters += delta;
    }
    return Math.round(gainMeters * METERS_TO_FEET);
  } catch {
    return null;
  }
}

/**
 * A coarse difficulty from distance + climb (feet per mile). Null when either
 * input is missing. Thresholds tuned for road riding, not hiking.
 */
export function elevationDifficulty(
  distanceMiles: number | null,
  elevationGainFt: number | null,
): { label: string; level: 1 | 2 | 3 } | null {
  if (elevationGainFt == null || distanceMiles == null || distanceMiles <= 0) return null;
  const ftPerMile = elevationGainFt / distanceMiles;
  if (ftPerMile < 60) return { label: "Easy climb", level: 1 };
  if (ftPerMile < 150) return { label: "Moderate climb", level: 2 };
  return { label: "Challenging climb", level: 3 };
}
