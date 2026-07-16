"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { useRiderProximity } from "@/components/location/rider-proximity";
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
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none";

// Address/place autocomplete backed by MapTiler geocoding. Captures a human
// place name, its street address, and coordinates. Degrades to a plain text
// input when no MapTiler key is configured.
export function LocationAutocomplete({
  fieldPrefix,
  label,
  placeholder,
  required,
  defaultValue,
}: LocationAutocompleteProps) {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
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
    if (!token) return;
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
      geocodeAddress(name, token, controller.signal, near ?? undefined)
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
  }, [name, token, near]);

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

      {address && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3 w-3 shrink-0 text-sunset" />
          {address}
        </p>
      )}

      <input type="hidden" name={`${fieldPrefix}Address`} value={address} />
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
