import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/notifications");
  }

  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });

  if (!rider) {
    redirect("/account");
  }

  const activities = await prisma.activity.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Notifications</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Recent Alerts and Activity</h1>
          <p className="mt-2 text-sm text-muted">Your latest follows, favorites, uploads, and build actions in one feed.</p>
        </div>

        <div className="space-y-2">
          {activities.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 h-4 w-4 text-sunset" />
                <div>
                  <p className="text-sm font-semibold text-ink">{item.summary}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">{item.type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-muted">{item.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
              </div>
            </article>
          ))}
          {activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center text-sm text-muted">
              No notifications yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
