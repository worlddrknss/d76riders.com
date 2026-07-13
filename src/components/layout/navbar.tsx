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
  if (currentUser?.id) {
    const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
    if (rider) {
      notificationCount = await prisma.activity.count({ where: { riderId: rider.id } });
    }
  }

  return <NavbarClient currentUser={user} notificationCount={notificationCount} />;
}
