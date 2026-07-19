import { redirect } from "next/navigation";

import { NotificationPrefsCard } from "@/components/account/notifications-card";
import { PushSettingsCard } from "@/components/account/push-settings-card";
import { SettingsNav } from "@/components/account/settings-nav";
import { AppShell } from "@/components/layout/app-shell";
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
    select: {
      emailOnMention: true,
      emailOnComment: true,
      emailOnRsvp: true,
      emailOnEventMessage: true,
      emailWeeklyRecap: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
          <SettingsNav />
        </div>

        <div className="max-w-3xl space-y-6">
          <PushSettingsCard
            vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null}
            initialQuietStart={rider?.quietHoursStart ?? null}
            initialQuietEnd={rider?.quietHoursEnd ?? null}
          />
          <NotificationPrefsCard
            prefs={{
              emailOnMention: rider?.emailOnMention ?? true,
              emailOnComment: rider?.emailOnComment ?? true,
              emailOnRsvp: rider?.emailOnRsvp ?? true,
              emailOnEventMessage: rider?.emailOnEventMessage ?? true,
              emailWeeklyRecap: rider?.emailWeeklyRecap ?? true,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
