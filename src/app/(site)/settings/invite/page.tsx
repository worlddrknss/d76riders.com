import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { InviteLink } from "@/components/community/invite-link";
import { SettingsNav } from "@/components/account/settings-nav";
import { AppShell } from "@/components/layout/app-shell";
import { InviteChart } from "@/components/profile/invite-chart";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getOrCreateReferralCode, referralStats } from "@/lib/referrals";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Invite — Settings", robots: { index: false, follow: false } };

export default async function InviteSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/settings/invite");
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!rider) redirect("/login");

  await getOrCreateReferralCode(rider.id);
  const referral = await referralStats(rider.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";
  const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-soft";
  const headingClass = "flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-asphalt";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
          <SettingsNav />
        </div>

        <div className="grid gap-5 lg:grid-cols-[21rem_1fr] xl:grid-cols-[23rem_1fr]">
          <div className="space-y-5">
            <div className={cardClass}>
              <h2 className={headingClass}>
                <UserPlus className="h-4 w-4 text-sunset" />
                Your invite
              </h2>
              <p className="mt-2 text-sm text-muted">Share your link. Anyone who joins through it is credited to you.</p>
              <div className="mt-4">
                <InviteLink url={`${siteUrl}/i/${referral.code}`} code={referral.code ?? ""} />
              </div>
            </div>

            <div className={cardClass}>
              <h2 className={headingClass}>So far</h2>
              <div className="mt-3 flex items-baseline gap-x-8 gap-y-2">
                <p className="flex flex-col">
                  <span className="font-display text-3xl font-bold text-ink">{referral.clicks}</span>
                  <span className="text-xs uppercase tracking-[0.08em] text-muted">Link opens</span>
                </p>
                <p className="flex flex-col">
                  <span className="font-display text-3xl font-bold text-sunset">{referral.conversions}</span>
                  <span className="text-xs uppercase tracking-[0.08em] text-muted">Riders joined</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <InviteChart data={referral.series} />

            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Riders you brought in</h2>
              {referral.referrals.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
                  <UserPlus className="mx-auto h-7 w-7 text-muted/50" />
                  <p className="mt-2 text-sm text-muted">No one has joined through your link yet.</p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {referral.referrals.map((entry) => {
                    const referred = entry.referredUser.rider;
                    if (!referred) return null;
                    return (
                      <li key={referred.handle}>
                        <Link
                          href={`/r/${referred.handle}`}
                          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40"
                        >
                          {referred.avatarUrl ? (
                            <img src={mediaUrl(referred.avatarUrl)} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-canvas text-[0.6rem] font-bold text-muted">
                              {referred.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{referred.name}</span>
                            <span className="block truncate text-xs text-muted">@{referred.handle}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
      </div>
    </AppShell>
  );
}
