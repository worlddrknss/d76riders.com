import { AppRailNav } from "@/components/layout/app-rail-nav";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Server wrapper for the persistent app rail: resolves the signed-in rider's
 * identity, trust level, and unread DM count, then hands off to the client nav
 * (which highlights the active destination). Renders nothing for visitors.
 */
export async function AppRail() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true, name: true, handle: true, avatarUrl: true, trust: { select: { level: true } } },
  });
  if (!rider) return null;

  // Same rides/miles definition as the profile + dashboard, so the rail agrees.
  const [unreadDms, hosted, goingRsvps, rideLogAgg] = await Promise.all([
    prisma.directMessage.count({
      where: {
        readAt: null,
        senderId: { not: rider.id },
        conversation: { OR: [{ riderAId: rider.id }, { riderBId: rider.id }] },
      },
    }),
    prisma.rideEvent.findMany({ where: { hostId: rider.id }, select: { id: true } }),
    prisma.rsvp.findMany({ where: { riderId: rider.id, status: "GOING" }, select: { eventId: true } }),
    prisma.rideLog.aggregate({ where: { riderId: rider.id }, _count: { _all: true }, _sum: { distanceMiles: true } }),
  ]);
  const participatedEventIds = new Set<string>([...hosted.map((e) => e.id), ...goingRsvps.map((r) => r.eventId)]);
  const rides = participatedEventIds.size + rideLogAgg._count._all;
  const miles = rideLogAgg._sum.distanceMiles ?? 0;

  return (
    <AppRailNav
      name={rider.name}
      handle={rider.handle}
      avatarUrl={mediaUrl(rider.avatarUrl)}
      trustLevel={rider.trust?.level ?? null}
      unreadDms={unreadDms}
      rides={rides}
      miles={miles}
    />
  );
}
