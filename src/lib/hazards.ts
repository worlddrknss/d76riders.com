import type { HazardType, Prisma } from "@prisma/client";

/**
 * Everything type-specific about a hazard in one table: how it reads, what
 * colour it paints on the map, which lucide icon marks it, and — the load-
 * bearing part — how long it lives.
 *
 * The lifespan encodes real road sense. Debris and a deer are gone in an hour
 * or two; a police car sits a while; roadwork is there for days. An expired
 * hazard is not deleted, it just stops counting as active, so the map isn't
 * haunted by a puddle that dried up last week.
 */
export const HAZARD_META: Record<
  HazardType,
  { label: string; blurb: string; color: string; icon: string; ttlHours: number }
> = {
  DEBRIS: { label: "Debris", blurb: "Gravel, a shredded tyre, something in the lane", color: "#b45309", icon: "cone", ttlHours: 4 },
  ANIMAL: { label: "Animal", blurb: "Deer, livestock, roadkill", color: "#65a30d", icon: "rabbit", ttlHours: 4 },
  WEATHER: { label: "Weather", blurb: "Ice, standing water, fog", color: "#0891b2", icon: "cloud-rain", ttlHours: 6 },
  POLICE: { label: "Police", blurb: "Patrol or speed enforcement", color: "#2563eb", icon: "shield-alert", ttlHours: 6 },
  ACCIDENT: { label: "Accident", blurb: "Collision or a blocked lane", color: "#b91c1c", icon: "car-front", ttlHours: 12 },
  ROADWORK: { label: "Roadwork", blurb: "Construction, closures, loose surface", color: "#ca8a04", icon: "construction", ttlHours: 24 * 7 },
  OTHER: { label: "Other", blurb: "Anything worth a warning", color: "#4b5563", icon: "triangle-alert", ttlHours: 24 },
};

// Ordered for the picker — most-reported first, Other last.
export const HAZARD_TYPES: HazardType[] = [
  "DEBRIS",
  "ROADWORK",
  "POLICE",
  "WEATHER",
  "ANIMAL",
  "ACCIDENT",
  "OTHER",
];

export function parseHazardType(value: string | null | undefined): HazardType | null {
  return value && value in HAZARD_META ? (value as HazardType) : null;
}

/** When a hazard of this type reported now should stop being shown. */
export function hazardExpiresAt(type: HazardType, from: Date = new Date()): Date {
  return new Date(from.getTime() + HAZARD_META[type].ttlHours * 60 * 60 * 1000);
}

/**
 * The one definition of "active", shared by every query and the map so they can
 * never disagree: not manually cleared, and not yet expired. Spread into a
 * Prisma `where`.
 */
export function activeHazardWhere(now: Date = new Date()): Prisma.HazardReportWhereInput {
  return { clearedAt: null, expiresAt: { gt: now } };
}

/** "2h ago", "just now" — coarse on purpose; a hazard's freshness is the point. */
export function hazardAge(createdAt: Date, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
