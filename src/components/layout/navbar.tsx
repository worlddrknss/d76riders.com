import { NavbarClient } from "@/components/layout/navbar-client";
import { resolveActivityHrefs } from "@/lib/activity-links";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function Navbar() {
  const currentUser = await getCurrentUser();
  const user = currentUser
    ? { ...currentUser, avatarUrl: mediaUrl(currentUser.avatarUrl) || null }
    : null;


  let notificationCount = 0;
  let dmUnreadCount = 0;
  let recentActivities: { id: string; summary: string; type: string; createdAt: string; readAt: string | null; href: string | null }[] = [];
  if (currentUser?.id) {
    const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
    if (rider) {
      [notificationCount, dmUnreadCount] = await Promise.all([
        prisma.activity.count({ where: { riderId: rider.id, readAt: null } }),
        prisma.directMessage.count({
          where: {
            readAt: null,
            senderId: { not: rider.id },
            conversation: { OR: [{ riderAId: rider.id }, { riderBId: rider.id }] },
          },
        }),
      ]);
      const activities = await prisma.activity.findMany({
        where: { riderId: rider.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      // Shared with the notifications page, so the bell and the inbox can't
      // disagree about where a notification leads.
      const hrefs = await resolveActivityHrefs(activities);
      recentActivities = activities.map((a) => ({
        id: a.id,
        summary: a.summary,
        type: a.type.replaceAll("_", " "),
        createdAt: a.createdAt.toISOString(),
        readAt: a.readAt?.toISOString() ?? null,
        href: hrefs[a.id] ?? null,
      }));
    }
  }

  return (
    <NavbarClient
      currentUser={user}
      notificationCount={notificationCount}
      dmUnreadCount={dmUnreadCount}
      recentActivities={recentActivities}
    />
  );
}
