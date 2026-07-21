import "server-only";

import { postableCrews } from "@/lib/crews";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { recentMeetupSpots } from "@/lib/events";
import { prisma } from "@/lib/prisma";

/**
 * Everything the create-event form needs, loaded once. Shared by the full
 * `/events/new` page and the intercepted modal so the two never drift.
 */
export async function loadCreateEventFormData(userId: string) {
  const recentSpots = await recentMeetupSpots();
  // Default the timezone to the organizer's own; list only their sub-communities.
  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { id: true, timezone: true },
  });
  const defaultTimezone = rider?.timezone ?? DEFAULT_TIMEZONE;
  const crews = rider ? await postableCrews(rider.id) : [];
  return { recentSpots, defaultTimezone, crews };
}
