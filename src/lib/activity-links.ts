import type { ActivityType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Where a notification should take you.
 *
 * `Activity.refId` is a loose reference whose meaning depends on the type, and
 * nothing on the record says which. This is the one place that knows, so the
 * bell dropdown and the notifications page can't disagree about it.
 *
 * Event and challenge pages are addressed by slug while refId holds an id, so
 * those need a lookup — done once for the whole batch rather than per row. A
 * reference to something since deleted simply resolves to no link, which is
 * also what an EVENT_CANCELLED notice for a deleted ride should do.
 */

/** refId is a JournalEntry id. */
const JOURNAL_TYPES = new Set<ActivityType>([
  "COMMENTED",
  "TWO_WHEELS_DOWN",
  "MENTIONED",
  "POSTED_JOURNAL",
]);

/** refId is a RideEvent id. */
const EVENT_TYPES = new Set<ActivityType>([
  "CREATED_EVENT",
  "RSVP",
  "RSVP_WAITLISTED",
  "WAITLIST_PROMOTED",
  "CHECK_IN",
  "CHECK_OUT",
  "MISSING_CHECKOUT",
  "NO_SHOW",
  "EVENT_MESSAGE",
  "EVENT_UPDATED",
  "EVENT_CANCELLED",
  "COMPLETED_RIDE",
  "RIDER_DOWN",
  "UPLOADED_PHOTO",
  "RIDE_REMINDER",
]);

/** refId is a Challenge id. */
const CHALLENGE_TYPES = new Set<ActivityType>(["CHALLENGE_JOINED", "CHALLENGE_COMPLETED"]);

export type LinkableActivity = {
  id: string;
  type: ActivityType;
  refId: string | null;
};

/** Maps activity id → href, omitting anything that has nowhere to go. */
export async function resolveActivityHrefs(
  activities: LinkableActivity[],
): Promise<Record<string, string>> {
  const eventIds = new Set<string>();
  const challengeIds = new Set<string>();

  for (const item of activities) {
    if (!item.refId) continue;
    if (EVENT_TYPES.has(item.type)) eventIds.add(item.refId);
    else if (CHALLENGE_TYPES.has(item.type)) challengeIds.add(item.refId);
  }

  const [events, challenges] = await Promise.all([
    eventIds.size
      ? prisma.rideEvent.findMany({ where: { id: { in: [...eventIds] } }, select: { id: true, slug: true } })
      : Promise.resolve([]),
    challengeIds.size
      ? prisma.challenge.findMany({
          where: { id: { in: [...challengeIds] } },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  const eventSlugs = new Map(events.map((e) => [e.id, e.slug]));
  const challengeSlugs = new Map(challenges.map((c) => [c.id, c.slug]));

  const hrefs: Record<string, string> = {};
  for (const item of activities) {
    if (!item.refId) continue;

    if (JOURNAL_TYPES.has(item.type)) {
      hrefs[item.id] = `/p/${item.refId}`;
      continue;
    }
    if (EVENT_TYPES.has(item.type)) {
      const slug = eventSlugs.get(item.refId);
      if (slug) hrefs[item.id] = `/events/${slug}`;
      continue;
    }
    if (CHALLENGE_TYPES.has(item.type)) {
      const slug = challengeSlugs.get(item.refId);
      if (slug) hrefs[item.id] = `/challenges/${slug}`;
    }
  }

  return hrefs;
}
