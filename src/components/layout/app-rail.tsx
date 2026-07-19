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

  const unreadDms = await prisma.directMessage.count({
    where: {
      readAt: null,
      senderId: { not: rider.id },
      conversation: { OR: [{ riderAId: rider.id }, { riderBId: rider.id }] },
    },
  });

  return (
    <AppRailNav
      name={rider.name}
      handle={rider.handle}
      avatarUrl={mediaUrl(rider.avatarUrl)}
      trustLevel={rider.trust?.level ?? null}
      unreadDms={unreadDms}
    />
  );
}
