/**
 * iCalendar (.ics / RFC 5545) generation for rides.
 *
 * Events store a true UTC instant (`startsAt`) plus an IANA `timezone`. We emit
 * DTSTART/DTEND in UTC (the trailing `Z`), which every calendar app converts to
 * the viewer's own zone — unambiguous, and no VTIMEZONE block to hand-roll.
 * There is no end time on a ride, so DTEND is synthesized as a two-hour block
 * from the meetup, enough for the entry to render as an event rather than a
 * zero-length blip.
 */

const PRODID = "-//District 76 Riders//Events//EN";
const EVENT_BLOCK_HOURS = 2;

/** Escape a TEXT value per RFC 5545 §3.3.11 (backslash, semicolon, comma, newlines). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** A UTC Date → "20260717T190000Z". */
function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Fold a content line to <=75 octets with CRLF + a leading space, per §3.1,
 * never splitting a multi-byte character.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75; // first line 75, continuation lines 74 (the leading space costs one)
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      out.push(current);
      current = char;
      bytes = size;
      limit = 74;
    } else {
      current += char;
      bytes += size;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

export type CalendarEvent = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  startsAt: Date;
  status: string; // EventStatus
  meetLocation: string | null;
  meetAddress: string | null;
  meetLat: number | null;
  meetLng: number | null;
  updatedAt: Date;
};

function vevent(event: CalendarEvent, baseUrl: string, now: Date): string[] {
  const url = `${baseUrl}/events/${event.slug}`;
  const end = new Date(event.startsAt.getTime() + EVENT_BLOCK_HOURS * 60 * 60 * 1000);

  const summaryParts = [event.excerpt, event.description].filter(Boolean) as string[];
  const description = [summaryParts[0] ?? "", `Details: ${url}`].filter(Boolean).join("\n\n");

  const location = [event.meetLocation, event.meetAddress].filter(Boolean).join(", ");

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@district76riders.com`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(event.startsAt)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    `LAST-MODIFIED:${toIcsUtc(event.updatedAt)}`,
    `STATUS:${event.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
    "SEQUENCE:0",
  ];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (event.meetLat != null && event.meetLng != null) {
    lines.push(`GEO:${event.meetLat};${event.meetLng}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

/** A full VCALENDAR document (CRLF-terminated) for one or more rides. */
export function buildCalendar(
  events: CalendarEvent[],
  opts: { baseUrl: string; name?: string; now?: Date },
): string {
  const now = opts.now ?? new Date();
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (opts.name) {
    header.push(`X-WR-CALNAME:${escapeText(opts.name)}`);
    // Ask subscribers to re-poll every 6 hours (roughly; apps treat it as a hint).
    header.push("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    header.push("X-PUBLISHED-TTL:PT6H");
  }
  const body = events.flatMap((e) => vevent(e, opts.baseUrl, now));
  return [...header, ...body, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
}
