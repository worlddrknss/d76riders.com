"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { geocodeAddress, type LngLat } from "@/lib/routing";

// District 76 is based in Clarksville but open to riders across Tennessee, so
// place searches bias toward wherever the rider actually is rather than always
// toward Clarksville. A rider in Memphis searching "Waffle House" should get the
// one down the road from them.
//
// The signal is the rider's own profile location ("Memphis, TN"), which costs no
// permission prompt and is already on their profile. It's free text, so it has
// to be geocoded — done once per session here rather than per search field, and
// held in context so every location input shares the one lookup.
//
// Null means "we don't know", and callers fall back to Clarksville: that covers
// signed-out riders, riders who never filled their profile in, and a location
// string that doesn't geocode to anything.
const RiderProximityContext = createContext<LngLat | null>(null);

/** The rider's approximate home coordinates, or null to fall back to Clarksville. */
export function useRiderProximity(): LngLat | null {
  return useContext(RiderProximityContext);
}

export function RiderProximityProvider({
  location,
  children,
}: {
  /** The rider's free-text profile location, e.g. "Memphis, TN". */
  location: string | null;
  children: ReactNode;
}) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
  const trimmed = location?.trim() ?? "";

  // Keyed by the location it was resolved from, so a resolved point is never
  // read against a different location than the one that produced it — changing
  // or clearing the profile location drops straight back to null.
  const [resolved, setResolved] = useState<{ from: string; point: LngLat } | null>(null);
  const near = resolved?.from === trimmed ? resolved.point : null;

  useEffect(() => {
    if (!token || !trimmed) return;

    // Deliberately not blocking render on this: proximity only matters once the
    // rider starts typing in a search field, which is always after mount.
    const controller = new AbortController();

    geocodeAddress(trimmed, token, controller.signal)
      .then((results) => {
        const top = results[0];
        if (top) setResolved({ from: trimmed, point: { lng: top.lng, lat: top.lat } });
      })
      // An unresolvable profile location isn't an error worth surfacing — the
      // rider still gets the Clarksville default.
      .catch(() => {});

    return () => controller.abort();
  }, [trimmed, token]);

  return <RiderProximityContext.Provider value={near}>{children}</RiderProximityContext.Provider>;
}
