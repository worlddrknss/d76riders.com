import "server-only";

// Server-side forward geocoding via Mapbox's Search Box API. This is the
// non-interactive counterpart to /api/geocode (which powers the autocomplete in
// authenticated forms): it turns a rider's free-text location into coordinates
// at signup / profile-save time, so "near me" sorting has something to measure
// distance from. Best-effort — never throws, returns null when unconfigured, the
// query is too short, or nothing matches.

const SEARCH_BOX = "https://api.mapbox.com/search/searchbox/v1";
// Clarksville — proximity bias so ambiguous names resolve toward the community.
const CLARKSVILLE: [number, number] = [-87.3595, 36.5298];

export type GeocodedPlace = { lat: number; lng: number; label: string };

export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  const token = process.env.MAPBOX_TOKEN;
  const q = query.trim();
  if (!token || q.length < 2) return null;

  try {
    const url =
      `${SEARCH_BOX}/forward?q=${encodeURIComponent(q)}` +
      `&proximity=${CLARKSVILLE[0]},${CLARKSVILLE[1]}&limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: {
      features?: { geometry?: { coordinates?: [number, number] }; properties?: { place_formatted?: string; full_address?: string; name?: string } }[];
    } = await res.json();

    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords) return null;

    const p = feature?.properties;
    const label = p?.place_formatted ?? p?.full_address ?? p?.name ?? q;
    return { lng: coords[0], lat: coords[1], label };
  } catch {
    return null;
  }
}
