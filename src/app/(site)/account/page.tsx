import { redirect } from "next/navigation";

import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/account");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { handle: true, bio: true, yearsRiding: true, location: true, timezone: true, favoriteRoad: true, youtubeUrl: true, tiktokUrl: true, instagramUrl: true, twitterUrl: true },
  });

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
      </div>
    </section>
  );
}
