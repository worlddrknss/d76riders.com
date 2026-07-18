"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { useRiderProximity } from "@/components/location/rider-proximity";
import { geocodeAddress, reverseGeocode, type GeocodeResult } from "@/lib/routing";

type LocationSearchProps = {
  // Called when the user picks an address or uses their location.
  onSelect: (location: { lng: number; lat: number; label: string }) => void;
};

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const listId = useId();
  const near = useRiderProximity();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced forward geocoding as the user types. The short-query clear lives
  // inside the timer so no state is set synchronously in the effect body.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (query.trim().length < 3) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      setError(null);
      geocodeAddress(query, controller.signal, near ?? undefined)
        .then((found) => {
          setResults(found);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== "AbortError") {
            setError("Search unavailable. Try again.");
          }
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, near]);

  // Close the results dropdown on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(result: GeocodeResult) {
    onSelect({ lng: result.lng, lat: result.lat, label: result.name });
    setQuery(result.name);
    setOpen(false);
    setResults([]);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location services are not available in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude: lng, latitude: lat } = position.coords;
        let label = "My location";
        try {
          const reversed = await reverseGeocode({ lng, lat });
          if (reversed) {
            label = reversed;
          }
        } catch {
          // Keep the fallback label if reverse geocoding fails.
        }
        onSelect({ lng, lat, label });
        setQuery(label);
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission denied."
            : "Could not get your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            role="combobox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search an address or place…"
            aria-label="Search for a starting address"
            aria-expanded={open}
            aria-controls={listId}
            className="w-full rounded-xl border border-border bg-white/80 py-2 pl-9 pr-9 text-sm text-asphalt placeholder:text-muted focus:border-sunset focus:outline-none"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setError(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-asphalt"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my location"
          aria-label="Use my location"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunset text-white transition hover:bg-[#cf5a26] disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
        >
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => choose(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-canvas"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-asphalt">
                    {result.name}
                  </span>
                  {result.context && (
                    <span className="block truncate text-xs text-muted">{result.context}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
