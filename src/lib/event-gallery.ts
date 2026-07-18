import type { EventStatus } from "@prisma/client";

/**
 * Whether an event's community gallery still accepts uploads. Computed on read —
 * no job closes anything:
 *   • a grace deadline is set → open until that instant (even after the ride, so
 *     attendees have time to upload), then closed.
 *   • no deadline → open until the ride is manually closed (COMPLETED).
 */
export function isGalleryOpen(event: { status: EventStatus; galleryClosesAt: Date | null }): boolean {
  if (event.galleryClosesAt) return Date.now() < event.galleryClosesAt.getTime();
  return event.status !== "COMPLETED";
}
