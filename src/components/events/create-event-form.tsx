"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, ImageIcon, Route as RouteIcon, Signal } from "lucide-react";

import type { MeetupSpot } from "@/lib/events";

import {
  createEventAction,
  type CreateEventFormState,
} from "@/app/(site)/events/new/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { EventRoutePlannerField } from "@/components/events/event-route-planner-field";
import { LocationAutocomplete } from "@/components/events/location-autocomplete";
import { DEFAULT_TIMEZONE, US_TIMEZONES } from "@/lib/datetime";

const initialCreateEventFormState: CreateEventFormState = {
  error: null,
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER_FRIENDLY: "Beginner Friendly",
  INTERMEDIATE: "Intermediate",
  SCENIC: "Scenic",
};

// Pull the short abbreviation ("CT") out of a timezone label like "Central (CT)".
function tzAbbrev(tz: string): string {
  const label = US_TIMEZONES.find((t) => t.value === tz)?.label ?? "";
  return label.match(/\(([^)]+)\)/)?.[1] ?? "";
}

// Format a datetime-local string as the ride's typed wall clock — no zone math,
// since the preview mirrors exactly what the organizer entered.
function formatWhen(value: string): { date: string; time: string | null } | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return null;
  let hh = 0;
  let mm = 0;
  if (timePart) {
    const [h, mi] = timePart.split(":").map((n) => Number.parseInt(n, 10));
    hh = h || 0;
    mm = mi || 0;
  }
  const dt = new Date(y, m - 1, d, hh, mm);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    date: dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: timePart ? dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null,
  };
}

/**
 * Live preview that mirrors the actual event detail page: title + status pill,
 * excerpt, the icon meta row (date · meet time · difficulty · distance), the
 * flyer poster, and the "About this ride" card.
 */
function EventPreview({
  title,
  excerpt,
  description,
  startsAt,
  timezone,
  difficulty,
  distance,
  crewName,
  photoUrl,
}: {
  title: string;
  excerpt: string;
  description: string;
  startsAt: string;
  timezone: string;
  difficulty: string;
  distance: string;
  crewName: string | null;
  photoUrl: string | null;
}) {
  const when = formatWhen(startsAt);
  const diffLabel = difficulty ? DIFFICULTY_LABELS[difficulty] ?? "Not specified" : "Not specified";
  const tz = tzAbbrev(timezone);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-2xl font-bold text-ink">{title.trim() || "Your event title"}</h3>
        <span className="shrink-0 rounded-full border border-forest/30 bg-forest/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-forest">
          Upcoming
        </span>
      </div>

      {excerpt.trim() ? (
        <p className="mt-2 text-sm text-muted">{excerpt}</p>
      ) : (
        <p className="mt-2 text-sm text-muted/50">A short summary of the ride will show here.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-sunset" />
          {when?.date ?? "Date TBD"}
        </span>
        {when?.time ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-sunset" />
            Meet {when.time}
            {tz ? ` ${tz}` : ""}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Signal className="h-4 w-4 text-sunset" />
          {diffLabel}
        </span>
        {distance ? (
          <span className="inline-flex items-center gap-1.5">
            <RouteIcon className="h-4 w-4 text-sunset" />
            {distance} mi
          </span>
        ) : null}
      </div>

      {crewName ? <p className="mt-2 text-xs font-semibold text-sunset">Posted to {crewName}</p> : null}

      {photoUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <img src={photoUrl} alt="" className="w-full object-cover" />
        </div>
      ) : (
        <div className="mt-4 flex aspect-[3/2] items-center justify-center rounded-xl border border-dashed border-border bg-canvas text-muted/40">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}

      {description.trim() ? (
        <div className="mt-4 rounded-xl border border-border bg-canvas/60 p-4">
          <h4 className="font-display text-base font-bold text-ink">About this ride</h4>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink/80">{description}</p>
        </div>
      ) : null}
    </div>
  );
}

export function CreateEventForm({
  recentSpots,
  defaultTimezone = DEFAULT_TIMEZONE,
  crews = [],
  withPreview = false,
}: {
  recentSpots?: { meet: MeetupSpot[]; ksu: MeetupSpot[] };
  defaultTimezone?: string;
  crews?: { id: string; name: string }[];
  /** Two-column form + live preview (used in the full-screen modal). */
  withPreview?: boolean;
}) {
  const [state, formAction] = useActionState<CreateEventFormState, FormData>(
    createEventAction,
    initialCreateEventFormState,
  );

  // Controlled only for the fields the live preview reflects; everything else
  // stays uncontrolled so the form submission is unchanged.
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [difficulty, setDifficulty] = useState("");
  const [distance, setDistance] = useState("");
  const [crewId, setCrewId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Blob URL for the chosen photo; revoke the previous one on change and the
  // last one on unmount so we don't leak object URLs.
  const photoUrlRef = useRef<string | null>(null);
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0] ?? null;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const next = file ? URL.createObjectURL(file) : null;
    photoUrlRef.current = next;
    setPhotoUrl(next);
  }
  useEffect(() => () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  const crewName = crewId ? crews.find((c) => c.id === crewId)?.name ?? null : null;

  const fields = (
    <>
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Event Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Saturday Sunrise Loop"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={255}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Short summary shown on the events page."
        />
        <p className={`text-right text-xs ${excerpt.length > 255 ? "text-red-600" : "text-muted"}`}>
          {excerpt.length}/255
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Pace, safety notes, and what riders should expect."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="facebookEventUrl" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Facebook Event URL
        </label>
        <input
          id="facebookEventUrl"
          name="facebookEventUrl"
          type="url"
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="https://www.facebook.com/events/..."
        />
      </div>

      {crews.length > 0 ? (
        <div className="space-y-1.5">
          <label htmlFor="crewId" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Sub-community (Optional)
          </label>
          <select
            id="crewId"
            name="crewId"
            value={crewId}
            onChange={(e) => setCrewId(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          >
            <option value="">No sub-community</option>
            {crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Posts this ride to a sub-community you belong to, so it shows on that group&apos;s calendar.</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="eventPhoto" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Event Photo
        </label>
        <input
          id="eventPhoto"
          name="eventPhoto"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handlePhoto}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="timezone" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
        >
          {US_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">The times below are the ride&apos;s local time in this zone.</p>
      </div>

      {/* The meetup carries two times: when to arrive, and when kickstands go up. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="startsAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Arrival Time (Required)
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
          <p className="text-xs text-muted">When riders should be at the meetup.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ksuAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            KSU Time (Optional)
          </label>
          <input
            id="ksuAt"
            name="ksuAt"
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
          <p className="text-xs text-muted">Kickstands up — when the ride rolls out.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="endsAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Event End (Optional)
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationAutocomplete
          fieldPrefix="meet"
          label="Meetup Location"
          placeholder="Search a place or address…"
          hint="Where riders gather and kickstands go up."
          recentSpots={recentSpots?.meet}
        />
        <LocationAutocomplete
          fieldPrefix="end"
          label="Final Destination (optional)"
          placeholder="Where the ride ends…"
          hint="Leave blank for an out-and-back or open-ended ride."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="distanceMiles" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Distance (Miles)
          </label>
          <input
            id="distanceMiles"
            name="distanceMiles"
            type="number"
            min={1}
            step={1}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="80"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="difficulty" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="SCENIC">Scenic</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="maxCapacity" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Max Capacity (Optional)
          </label>
          <input
            id="maxCapacity"
            name="maxCapacity"
            type="number"
            min={1}
            step={1}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="No limit"
          />
          <p className="text-xs text-muted">Riders beyond capacity join a waitlist.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rsvpDeadline" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            RSVP Deadline (Optional)
          </label>
          <input
            id="rsvpDeadline"
            name="rsvpDeadline"
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="galleryClosesAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Gallery Closes (Optional)
          </label>
          <input
            id="galleryClosesAt"
            name="galleryClosesAt"
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
          <p className="text-xs text-muted">Photo uploads stay open until this time, then the gallery closes.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-canvas/80 p-4">
        <h3 className="font-display text-lg font-semibold text-asphalt">Official Event Route (Optional)</h3>
        <p className="mt-1 text-sm text-muted">Launch the route planner to define the official route for this event.</p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="routeName" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Route Name
            </label>
            <input
              id="routeName"
              name="routeName"
              type="text"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
              placeholder="LBL Scenic Loop"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="routeDescription" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Route Description
            </label>
            <textarea
              id="routeDescription"
              name="routeDescription"
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
              placeholder="Fuel stop near mile 40, tighter corners after mile 50."
            />
          </div>

          <EventRoutePlannerField />
        </div>
      </div>
    </>
  );

  const errorEl = state.error ? (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  ) : null;

  const preview = (
    <EventPreview
      title={title}
      excerpt={excerpt}
      description={description}
      startsAt={startsAt}
      timezone={timezone}
      difficulty={difficulty}
      distance={distance}
      crewName={crewName}
      photoUrl={photoUrl}
    />
  );

  // Single column — the standalone /events/new page.
  if (!withPreview) {
    return (
      <form action={formAction} className="space-y-5">
        {fields}
        {errorEl}
        <AuthSubmitButton idleLabel="Create Event" pendingLabel="Creating Event..." />
      </form>
    );
  }

  // Two-column form + live preview, with a pinned footer — the full-screen modal.
  return (
    <form action={formAction} className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-5">
            {fields}
            {errorEl}
          </div>
        </div>
        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
          <div className="mx-auto max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
            <div className="mt-3">{preview}</div>
            <p className="mt-3 text-xs text-muted">Roughly how your ride will appear on the events page.</p>
          </div>
        </aside>
      </div>
      <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <AuthSubmitButton idleLabel="Create Event" pendingLabel="Creating Event..." />
        </div>
      </div>
    </form>
  );
}
