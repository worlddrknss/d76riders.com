import { redirect } from "next/navigation";

import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { CalendarSubscribe } from "@/components/profile/calendar-subscribe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/account");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { handle: true, bio: true, yearsRiding: true, location: true, timezone: true, calendarToken: true, favoriteRoad: true, youtubeUrl: true, tiktokUrl: true, instagramUrl: true, twitterUrl: true },
  });

  const calendarPath = rider?.calendarToken ? `/api/riders/${rider.calendarToken}/calendar.ics` : null;
  const httpsUrl = calendarPath ? `${SITE_URL}${calendarPath}` : null;
  // webcal:// makes calendar apps offer to *subscribe* rather than one-time import.
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https?:/, "webcal:") : null;

  const currentYear = new Date().getFullYear();
  const yearStartedRiding = rider?.yearsRiding != null
    ? Math.max(1900, currentYear - rider.yearsRiding)
    : null;

  function extractHandle(url: string | null): string {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, "").replace(/^@/, "");
    } catch {
      return url.replace(/^@/, "");
    }
  }

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        {rider?.handle && <RiderSubNav handle={rider.handle} />}

        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Account</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Edit Profile</h1>
          <p className="mt-2 text-sm text-muted">
            Changes here update your public profile immediately.
          </p>

          <div className="mt-6">
            <AccountProfileForm
              displayName={currentUser.name ?? ""}
              username={currentUser.handle ?? ""}
              avatarUrl={currentUser.avatarUrl ?? currentUser.image ?? ""}
              bio={rider?.bio ?? ""}
              location={rider?.location ?? ""}
              timezone={rider?.timezone ?? null}
              favoriteRoad={rider?.favoriteRoad ?? ""}
              yearStartedRiding={yearStartedRiding}
              youtubeUrl={extractHandle(rider?.youtubeUrl ?? null)}
              tiktokUrl={extractHandle(rider?.tiktokUrl ?? null)}
              instagramUrl={extractHandle(rider?.instagramUrl ?? null)}
              twitterUrl={extractHandle(rider?.twitterUrl ?? null)}
            />
          </div>
        </div>

        <CalendarSubscribe webcalUrl={webcalUrl} httpsUrl={httpsUrl} />
      </div>
    </section>
  );
}
