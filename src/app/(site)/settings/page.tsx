import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationPrefsCard } from "@/components/account/notifications-card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Settings — D76 Riders" };

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?next=/settings");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { emailOnMention: true, emailOnComment: true, emailOnRsvp: true },
  });

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Settings</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Notifications</h1>
          </div>
          <Link href="/account" className="text-sm font-medium text-sunset hover:underline">
            Account &amp; profile →
          </Link>
        </div>

        <div className="mx-auto max-w-3xl">
          <NotificationPrefsCard
            prefs={{
              emailOnMention: rider?.emailOnMention ?? true,
              emailOnComment: rider?.emailOnComment ?? true,
              emailOnRsvp: rider?.emailOnRsvp ?? true,
            }}
          />
        </div>
      </div>
    </section>
  );
}
