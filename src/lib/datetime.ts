import { DateTime } from "luxon";

/**
 * Event date/time handling.
 *
 * Event times are stored as true UTC instants, each with an IANA `timezone` (the
 * zone the ride happens in). Everything a rider sees is rendered in that zone, so
 * the "meet at 7" on the flyer always matches the page. Luxon does the zone- and
 * DST-aware conversion; these wrappers keep the call sites tidy and consistent.
 */

export const DEFAULT_TIMEZONE = "America/Chicago";

/** The zones riders actually pick from — curated, not the full IANA list. */
export const US_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
];

export function isValidTimezone(tz: string | null | undefined): tz is string {
  return !!tz && DateTime.now().setZone(tz).isValid;
}

function zoned(utc: Date, tz: string): DateTime {
  const dt = DateTime.fromJSDate(utc, { zone: tz });
  return dt.isValid ? dt : DateTime.fromJSDate(utc, { zone: DEFAULT_TIMEZONE });
}

/** "Fri, Jul 17, 2026" in the event's zone. */
export function formatEventDate(utc: Date, tz: string): string {
  return zoned(utc, tz).toFormat("ccc, LLL d, yyyy");
}

/** "7:00 PM CDT" — the event's local time with its zone abbreviation. */
export function formatEventTime(utc: Date, tz: string): string {
  return zoned(utc, tz).toFormat("h:mm a ZZZZ");
}

/** "7:00 PM" — the event's local time, no zone label (for tight card rows). */
export function formatEventTimeShort(utc: Date, tz: string): string {
  return zoned(utc, tz).toFormat("h:mm a");
}

/**
 * "Jul 23, 2026 · 8:27 PM" for a post, comment, or anything else stamped with
 * `createdAt` — rendered in the *viewer's* zone, not the event's.
 *
 * These were previously formatted with a bare toLocaleDateString() on the
 * server, which resolves to the container's zone (UTC). A post written at 8pm
 * Central was already the next day in UTC, so the feed dated it tomorrow.
 *
 * With no viewer zone (signed out, or never set) it falls back to Central and
 * says so, rather than quietly implying the reader's own local time.
 */
export function formatPostTimestamp(utc: Date, viewerTz: string | null | undefined): string {
  const known = isValidTimezone(viewerTz);
  const dt = zoned(utc, known ? viewerTz : DEFAULT_TIMEZONE);
  return dt.toFormat(known ? "LLL d, yyyy · h:mm a" : "LLL d, yyyy · h:mm a ZZZZ");
}

/** The calendar-badge day + month, in the event's zone. */
export function eventDayMonth(utc: Date, tz: string): { day: string; month: string } {
  const dt = zoned(utc, tz);
  return { day: dt.toFormat("dd"), month: dt.toFormat("LLL").toUpperCase() };
}

/**
 * "8:00 PM your time", or null when there's no viewer zone or it lands on the
 * same wall-clock as the event zone at that instant — so the hint only appears
 * when it actually differs.
 */
export function viewerTimeHint(utc: Date, eventTz: string, viewerTz: string | null | undefined): string | null {
  if (!isValidTimezone(viewerTz)) return null;
  const inEvent = zoned(utc, eventTz);
  const inViewer = DateTime.fromJSDate(utc, { zone: viewerTz });
  if (inEvent.toFormat("yyyy-LL-dd HH:mm") === inViewer.toFormat("yyyy-LL-dd HH:mm")) return null;
  return `${inViewer.toFormat("h:mm a")} your time`;
}

/** A stored UTC instant → "2026-07-17T19:00" in the zone, for a datetime-local input. */
export function toZonedInputValue(utc: Date, tz: string): string {
  return zoned(utc, tz).toFormat("yyyy-LL-dd'T'HH:mm");
}

/**
 * A datetime-local string ("2026-07-17T19:00") entered as wall-clock in `tz` →
 * the true UTC instant. Returns null for empty/invalid input.
 */
export function zonedInputToUtc(value: string, tz: string): Date | null {
  if (!value) return null;
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  const dt = DateTime.fromISO(value, { zone });
  return dt.isValid ? dt.toJSDate() : null;
}

/** Start of today in `tz`, as a UTC instant — the "still upcoming" cutoff. */
export function startOfTodayUtc(tz: string | null | undefined): Date {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  return DateTime.now().setZone(zone).startOf("day").toJSDate();
}

/** Does this UTC instant fall on today's calendar date in `tz`? */
export function isSameDayInTz(utc: Date, tz: string): boolean {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  return zoned(utc, zone).hasSame(DateTime.now().setZone(zone), "day");
}
