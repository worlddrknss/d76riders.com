import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { InviteLink } from "@/components/community/invite-link";
import { prisma } from "@/lib/prisma";
import { getOrCreateReferralCode, referralStats } from "@/lib/referrals";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Invite Riders | District 76 Riders",
};

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login?next=/invite");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!rider) {
    redirect("/");
  }

  // Minted on first visit rather than for every rider up front.
  await getOrCreateReferralCode(rider.id);
  const stats = await referralStats(rider.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";
  const inviteUrl = `${siteUrl}/i/${stats.code}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Community</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Invite Riders</h1>
        <p className="mt-2 text-sm text-muted">
          Share your link. Anyone who joins through it is credited to you.
        </p>
      </header>

      <InviteLink url={inviteUrl} code={stats.code ?? ""} />

      <section className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-canvas p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Link opens</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{stats.clicks}</p>
        </div>
        <div className="rounded-xl border border-border bg-canvas p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Riders joined</p>
          <p className="mt-1 font-display text-3xl font-bold text-sunset">{stats.conversions}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Riders you brought in</h2>
        {stats.referrals.length === 0 ? (
          <div className="mt-3 rounded-xl border border-border bg-canvas p-8 text-center">
            <UserPlus className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-2 text-sm text-muted">No one has joined through your link yet.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.referrals.map((referral) => {
              const referred = referral.referredUser.rider;
              if (!referred) return null;
              return (
                <li key={referred.handle}>
                  <Link
                    href={`/r/${referred.handle}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-canvas p-3 transition hover:border-ink/30"
                  >
                    {referred.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={referred.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-[0.6rem] font-bold text-muted">
                        {referred.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{referred.name}</span>
                      <span className="block truncate text-xs text-muted">@{referred.handle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {referral.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
