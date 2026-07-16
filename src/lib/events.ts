import type { EventStatus } from "@prisma/client";

/**
 * Ride statuses the public listings are allowed to show.
 *
 * Deliberately excludes CANCELLED and DRAFT:
 *   CANCELLED — the triage queue cancels a reported ride as its takedown, and a
 *               cancelled ride shouldn't keep advertising itself or taking RSVPs.
 *   DRAFT     — nothing creates drafts today (status defaults to UPCOMING), but
 *               the enum allows them, so the listings shouldn't leak one the day
 *               something starts producing them.
 *
 * The event's own page still renders for a cancelled ride — riders who signed up
 * need to see that it's off. It's the *listings* that shouldn't offer it.
 */
export const PUBLIC_EVENT_STATUSES: EventStatus[] = ["UPCOMING", "COMPLETED"];
