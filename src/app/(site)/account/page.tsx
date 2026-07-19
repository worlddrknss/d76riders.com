import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";

import { EmailChangeCard } from "@/components/account/notifications-card";
import { DeleteAccountCard, PasswordChangeCard } from "@/components/account/security-cards";
import { CalendarSubscribe } from "@/components/profile/calendar-subscribe";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export const metadata = { title: "Account — D76 Riders" };

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/account");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { handle: true, calendarToken: true },
  });

  const calendarPath = rider?.calendarToken ? `/api/riders/${rider.calendarToken}/calendar.ics` : null;
  const httpsUrl = calendarPath ? `${SITE_URL}${calendarPath}` : null;
  // webcal:// makes calendar apps offer to *subscribe* rather than one-time import.
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https?:/, "webcal:") : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Account</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Account &amp; security</h1>
          </div>
          <Link href="/settings" className="text-sm font-medium text-sunset hover:underline">
            Notification settings →
          </Link>
        </div>

        {/* Public profile lives in the Edit Profile modal on the profile itself —
            this page is only account & security, so it doesn't duplicate those fields. */}
        {rider?.handle && (
          <div className="flex max-w-3xl items-center justify-between rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Public profile</h2>
              <p className="mt-0.5 text-sm text-muted">Edit your name, photo, bio, and socials from your profile.</p>
            </div>
            <Link
              href={`/r/${rider.handle}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-asphalt/85"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </div>
        )}

        <div className="max-w-3xl space-y-6">
          <EmailChangeCard email={currentUser.email} emailVerified={Boolean(currentUser.emailVerified)} />
          <PasswordChangeCard />
        </div>

        <CalendarSubscribe webcalUrl={webcalUrl} httpsUrl={httpsUrl} />

        <div className="max-w-3xl">
          <DeleteAccountCard />
        </div>
      </div>
    </AppShell>
  );
}
