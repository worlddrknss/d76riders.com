import { CalendarDays, Clock3, ImageIcon, Route as RouteIcon, Signal } from "lucide-react";

import { US_TIMEZONES } from "@/lib/datetime";

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
 * flyer poster, and the "About this ride" card. Shared by the create and edit
 * event modals.
 */
export function EventPreview({
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
        <h3 className="font-display text-2xl text-ink">{title.trim() || "Your event title"}</h3>
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
        <div className="mt-4 flex aspect-3/2 items-center justify-center rounded-xl border border-dashed border-border bg-canvas text-muted/40">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}

      {description.trim() ? (
        <div className="mt-4 rounded-xl border border-border bg-canvas/60 p-4">
          <h4 className="font-display text-base text-ink">About this ride</h4>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink/80">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
