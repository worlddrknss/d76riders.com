import { prisma } from "@/lib/prisma";

import {
  type NotificationCategory,
  type NotificationChannel,
} from "@/lib/notification-catalog";

/**
 * Preference lookups. Kept apart from the catalogue because this imports
 * Prisma, and the settings card is a client component — importing the two
 * together dragged the Postgres driver into the browser bundle.
 */

export * from "@/lib/notification-catalog";

/**
 * The riders, out of those given, who still want this category on this channel.
 * Order is not preserved; callers fan out rather than index.
 */
export async function ridersOptedIn(
  riderIds: string[],
  category: NotificationCategory,
  channel: NotificationChannel,
): Promise<string[]> {
  const unique = [...new Set(riderIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const optedOut = await prisma.notificationPreference.findMany({
    where: { riderId: { in: unique }, category, channel },
    select: { riderId: true },
  });

  if (optedOut.length === 0) return unique;
  const off = new Set(optedOut.map((row) => row.riderId));
  return unique.filter((id) => !off.has(id));
}

/** The routes one rider has switched off, as a `category:channel` set. */
export async function disabledRoutesFor(riderId: string): Promise<Set<string>> {
  const rows = await prisma.notificationPreference.findMany({
    where: { riderId },
    select: { category: true, channel: true },
  });
  return new Set(rows.map((row) => `${row.category}:${row.channel}`));
}
