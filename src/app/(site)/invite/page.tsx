import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { InviteLink } from "@/components/community/invite-link";
import { PageHero } from "@/components/layout/page-hero";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { getOrCreateReferralCode, referralStats } from "@/lib/referrals";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Invite Riders",
  description: "Invite riders to the District 76 Riders community and track who joins through your link.",
  alternates: { canonical: "/invite" },
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
    <div>
      <PageHero
        image={siteImages.pageHeroes.invite}
        eyebrow="Community"
        title="Invite Riders"
        description="Share your link. Anyone who joins through it is credited to you."
      />

      <section className="page-shell">
        <div className="content-wrap">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <InviteLink url={inviteUrl} code={stats.code ?? ""} />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Link opens</p>
                <p className="mt-1 font-display text-3xl font-bold text-ink">{stats.clicks}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Riders joined</p>
                <p className="mt-1 font-display text-3xl font-bold text-sunset">{stats.conversions}</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Riders you brought in</h2>
              {stats.referrals.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
                  <UserPlus className="mx-auto h-7 w-7 text-muted/50" />
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
                          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40"
                        >
                          {referred.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={referred.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-canvas text-[0.6rem] font-bold text-muted">
                              {referred.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {referred.name}
                            </span>
                            <span className="block truncate text-xs text-muted">@{referred.handle}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {referral.createdAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
