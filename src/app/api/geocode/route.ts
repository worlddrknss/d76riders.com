import { NextResponse, type NextRequest } from "next/server";

import { haversineMiles, type GeocodeResult } from "@/lib/routing";
import { getCurrentUser } from "@/lib/session";

// Place search runs through Mapbox's Search Box API, proxied here rather than
// called from the browser, for two reasons: the token stays out of the JS bundle
// and comes from the runtime environment (so it lives in Citadel, not a
// build-time NEXT_PUBLIC_* baked into the image), and a session is required, so
// our quota can't be spent by anyone who finds the endpoint.
//
// Every caller is already an authenticated create/edit form, so requiring a
// session costs nothing today.
const SEARCH_BOX = "https://api.mapbox.com/search/searchbox/v1";

// Clarksville — the fallback when we don't know where the rider is.
const CLARKSVILLE: [number, number] = [-87.3595, 36.5298];

type MapboxFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
  };
};

function toResult(f: MapboxFeature): GeocodeResult | null {
  const coords = f.geometry?.coordinates;
  const p = f.properties;
  if (!coords || !p?.name) return null;

  // full_address repeats the name for address-type features ("2235 Madison
  // Street, Clarksville, ..."), so strip it rather than render it twice.
  const full = p.full_address ?? p.place_formatted ?? "";
  const context = full.startsWith(p.name)
    ? full.slice(p.name.length).replace(/^,\s*/, "")
    : full;

  return {
    id: p.mapbox_id ?? `${coords[0]},${coords[1]}`,
    name: p.name,
    context,
    lng: coords[0],
    lat: coords[1],
  };
}

// Mapbox's proximity is a bias, not an ordering — searching "QuikTrip" from
// Clarksville ranks the Dickson store 40 miles away above the local one. So
// order points of interest by distance from the rider.
//
// Points of interest only. A chain's branches are interchangeable, so nearest
// is the one meant; an address is discriminated by its house number, and a city
// by Mapbox's own judgement. Sorting those by distance answers "2235 Madison
// Street" with the nearest stretch of Madison Street instead of the building.
// The sort is stable, so anything that isn't a poi arrives untouched.
function orderForRider(features: MapboxFeature[], from: [number, number]): MapboxFeature[] {
  const typeOrder: string[] = [];
  for (const f of features) {
    const t = f.properties?.feature_type ?? "";
    if (!typeOrder.includes(t)) typeOrder.push(t);
  }

  return [...features].sort((a, b) => {
    const ta = a.properties?.feature_type ?? "";
    const tb = b.properties?.feature_type ?? "";

    const rankA = typeOrder.indexOf(ta);
    const rankB = typeOrder.indexOf(tb);
    if (rankA !== rankB) return rankA - rankB;

    if (ta !== "poi") return 0;

    const ca = a.geometry?.coordinates;
    const cb = b.geometry?.coordinates;
    if (!ca || !cb) return 0;
    return haversineMiles(from, ca) - haversineMiles(from, cb);
  });
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Sign in to search places." }, { status: 401 });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Place search is not configured." }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "reverse" ? "reverse" : "forward";

  const lng = Number(params.get("lng"));
  const lat = Number(params.get("lat"));
  const hasPoint = Number.isFinite(lng) && Number.isFinite(lat);

  let url: string;
  if (mode === "reverse") {
    if (!hasPoint) {
      return NextResponse.json({ error: "Missing coordinates." }, { status: 400 });
    }
    url = `${SEARCH_BOX}/reverse?longitude=${lng}&latitude=${lat}&limit=1&access_token=${token}`;
  } else {
    const q = (params.get("q") ?? "").trim();
    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }
    // Ask for more than we show: the nearest match is often outside Mapbox's own
    // top 5, and 10 is its cap.
    const near: [number, number] = hasPoint ? [lng, lat] : CLARKSVILLE;
    url =
      `${SEARCH_BOX}/forward?q=${encodeURIComponent(q)}` +
      `&proximity=${near[0]},${near[1]}&limit=10&access_token=${token}`;
  }

  const res = await fetch(url, { signal: request.signal });
  if (!res.ok) {
    return NextResponse.json({ error: "Place search failed." }, { status: 502 });
  }

  const data: { features?: MapboxFeature[] } = await res.json();
  const features = data.features ?? [];

  if (mode === "reverse") {
    const top = features[0];
    const label = top?.properties?.full_address ?? top?.properties?.name ?? null;
    return NextResponse.json({ label });
  }

  const from: [number, number] = hasPoint ? [lng, lat] : CLARKSVILLE;
  const results = orderForRider(features, from)
    .map(toResult)
    .filter((r): r is GeocodeResult => r !== null)
    .slice(0, 5);

  return NextResponse.json({ results });
}
