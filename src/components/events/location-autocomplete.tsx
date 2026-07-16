"use client";

import { useEffect, useRef, useState } from "react";
import { History, Loader2, MapPin } from "lucide-react";

import { useRiderProximity } from "@/components/location/rider-proximity";
import type { MeetupSpot } from "@/lib/events";
import { geocodeAddress, type GeocodeResult } from "@/lib/routing";

type LocationAutocompleteProps = {
  fieldPrefix: string; // e.g. "meet" or "ksu" — drives the submitted field names
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: {
    name?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  /** Places riders have met at before, offered as one-click fills. */
  recentSpots?: MeetupSpot[];
  /** Short note under the field, for when blank carries a meaning of its own. */
  hint?: string;
};

const fieldClass =
  "w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-ink shadow-soft focus:border-sunset/50 focus:outline-none";

const inputClass = `mt-1 ${fieldClass} text-sm`;

// The address sits directly under the venue name, so it carries no top margin of
// its own and leaves room for the pin.
const addressInputClass = `${fieldClass} pl-8 text-xs`;

// Address/place autocomplete backed by Mapbox place search, proxied through
// /api/geocode. Captures a human place name, its street address, and the
// coordinates riders navigate to.
export function LocationAutocomplete({
  fieldPrefix,
  label,
  placeholder,
  required,
  defaultValue,
  recentSpots = [],
  hint,
}: LocationAutocompleteProps) {
  const near = useRiderProximity();
  const [name, setName] = useState(defaultValue?.name ?? "");
  const [address, setAddress] = useState(defaultValue?.address ?? "");
  const [lat, setLat] = useState<number | null>(defaultValue?.lat ?? null);
  const [lng, setLng] = useState<number | null>(defaultValue?.lng ?? null);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skip geocoding the first render (a pre-filled value) and any programmatic pick.
  const skipNext = useRef(Boolean(defaultValue?.name));

  // Debounced forward geocoding as the user types.
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (name.trim().length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      geocodeAddress(name, controller.signal, near ?? undefined)
        .then((found) => {
          setResults(found);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [name, near]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(result: GeocodeResult) {
    skipNext.current = true;
    setName(result.name);
    setAddress(result.context);
    setLat(result.lat);
    setLng(result.lng);
    setResults([]);
    setOpen(false);
  }

  // Reusing a past spot is not a search: the coordinates were already resolved
  // when someone picked this place the first time, so this costs no request and
  // lands on exactly the same point — including any address typed by hand.
  function fillFromSpot(spot: MeetupSpot) {
    skipNext.current = true;
    setName(spot.name);
    setAddress(spot.address ?? "");
    setLat(spot.lat);
    setLng(spot.lng);
    setResults([]);
    setOpen(false);
  }

  function handleChange(value: string) {
    setName(value);
    // Free-typed text no longer corresponds to a geocoded point.
    setAddress("");
    setLat(null);
    setLng(null);
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label htmlFor={`${fieldPrefix}-location`} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={`${fieldPrefix}-location`}
          name={`${fieldPrefix}Location`}
          type="text"
          value={name}
          required={required}
          autoComplete="off"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {/* Only while the field is empty: once a place is chosen these would be
          noise, and they'd sit under the dropdown anyway. */}
      {recentSpots.length > 0 && name.trim() === "" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">
            Recent
          </span>
          {recentSpots.map((spot) => (
            <button
              key={`${spot.name}-${spot.lat}-${spot.lng}`}
              type="button"
              onClick={() => fillFromSpot(spot)}
              title={spot.address ?? spot.name}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs text-muted transition hover:border-sunset/50 hover:text-asphalt"
            >
              <History className="h-3 w-3 shrink-0 text-sunset" />
              <span className="max-w-48 truncate">{spot.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Editable rather than a read-only echo of the geocoder: a venue can still
          come back without a street, and riders have to navigate to this. Prefilled
          on pick, kept on edit. */}
      <div className="relative">
        <label htmlFor={`${fieldPrefix}-address`} className="sr-only">
          {label} address
        </label>
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sunset" />
        <input
          id={`${fieldPrefix}-address`}
          name={`${fieldPrefix}Address`}
          type="text"
          value={address}
          autoComplete="off"
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address"
          className={addressInputClass}
        />
      </div>

      {hint ? <p className="text-[0.7rem] leading-snug text-muted">{hint}</p> : null}

      <input type="hidden" name={`${fieldPrefix}Lat`} value={lat ?? ""} />
      <input type="hidden" name={`${fieldPrefix}Lng`} value={lng ?? ""} />

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
        >
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => pick(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-canvas"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-asphalt">{result.name}</span>
                  {result.context && <span className="block truncate text-xs text-muted">{result.context}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
