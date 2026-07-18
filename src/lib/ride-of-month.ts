import { DEFAULT_TIMEZONE } from "@/lib/datetime";

/** "YYYY-MM" for a date in the community timezone. Defaults to now. */
export function periodForDate(date: Date = new Date()): string {
  // en-CA yields YYYY-MM-DD; slice to the month.
  return date
    .toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .slice(0, 7);
}

/** Human label for a "YYYY-MM" period, e.g. "July 2026". */
export function periodLabel(period: string): string {
  const [year, month] = period.split("-").map((n) => Number.parseInt(n, 10));
  if (!year || !month) return period;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
