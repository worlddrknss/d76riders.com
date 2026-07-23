import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationList, type NotificationItem } from "@/components/notifications/notification-list";
import { resolveActivityHrefs } from "@/lib/activity-links";
import { formatPostTimestamp } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/notifications");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true, timezone: true },
  });

  if (!rider) {
    redirect("/account");
  }

  const [activities, unreadCount] = await Promise.all([
    prisma.activity.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, type: true, summary: true, refId: true, readAt: true, createdAt: true },
    }),
    prisma.activity.count({ where: { riderId: rider.id, readAt: null } }),
  ]);

  const hrefs = await resolveActivityHrefs(activities);

  const items: NotificationItem[] = activities.map((item) => ({
    id: item.id,
    type: item.type,
    summary: item.summary,
    // Formatted server-side in the rider's own zone, not the container's.
    timeLabel: formatPostTimestamp(item.createdAt, rider.timezone),
    isUnread: item.readAt === null,
    href: hrefs[item.id] ?? null,
  }));

  return (
    <AppShell>
      <div className="max-w-2xl">
        <PageHeader
          icon={BellRing}
          eyebrow="Notifications"
          title="Alerts"
          subtitle="Rides you're on, replies to your posts, and anything that needs you. Tap one to open it."
        />
        <div className="mt-6">
          <NotificationList items={items} unreadCount={unreadCount} />
        </div>
      </div>
    </AppShell>
  );
}
