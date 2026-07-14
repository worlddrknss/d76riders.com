import { NavbarClient } from "@/components/layout/navbar-client";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function Navbar() {
  const currentUser = await getCurrentUser();
  const user = currentUser
    ? { ...currentUser, avatarUrl: mediaUrl(currentUser.avatarUrl) || null }
    : null;

  let notificationCount = 0;
  let recentActivities: { id: string; summary: string; type: string; createdAt: string; readAt: string | null }[] = [];
  if (currentUser?.id) {
    const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
    if (rider) {
      notificationCount = await prisma.activity.count({ where: { riderId: rider.id, readAt: null } });
      const activities = await prisma.activity.findMany({
        where: { riderId: rider.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      recentActivities = activities.map((a) => ({
        id: a.id,
        summary: a.summary,
        type: a.type.replaceAll("_", " "),
        createdAt: a.createdAt.toISOString(),
        readAt: a.readAt?.toISOString() ?? null,
      }));
    }
  }

  return <NavbarClient currentUser={user} notificationCount={notificationCount} recentActivities={recentActivities} />;
}
