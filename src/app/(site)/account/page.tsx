import { redirect } from "next/navigation";

import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/account");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { bio: true, yearsRiding: true },
  });

  const currentYear = new Date().getFullYear();
  const yearStartedRiding = rider?.yearsRiding != null
    ? Math.max(1900, currentYear - rider.yearsRiding)
    : null;

  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Account</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Your Profile</h1>
          <p className="mt-2 text-sm text-muted">
            Update your display name, username, and avatar. These details appear in community-facing areas.
          </p>

          <div className="mt-6">
            <AccountProfileForm
              displayName={currentUser.name ?? ""}
              username={currentUser.handle ?? ""}
              avatarUrl={currentUser.avatarUrl ?? currentUser.image ?? ""}
              bio={rider?.bio ?? ""}
              yearStartedRiding={yearStartedRiding}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
