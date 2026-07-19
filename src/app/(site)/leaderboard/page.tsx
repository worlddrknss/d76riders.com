import Link from "next/link";
import { OG_IMAGE } from "@/lib/og";
import type { Metadata } from "next";
import type { TrustLevel } from "@prisma/client";
import { Trophy } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeChip } from "@/components/reputation/badge-chip";
import { TrustBadge } from "@/components/reputation/trust-badge";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Rider progression across the District 76 Riders community — trust levels, miles ridden, and badges earned.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    images: OG_IMAGE,
    title: "Leaderboard — District 76 Riders",
    description: "Trust levels, miles ridden, and badges earned across the community.",
  },
};

export const dynamic = "force-dynamic";

type SortKey = "trust" | "miles" | "rides" | "badges";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "trust", label: "Trust" },
  { key: "miles", label: "Miles" },
  { key: "rides", label: "Rides" },
  { key: "badges", label: "Badges" },
];

// Podium colours for the top three; everyone else gets muted.
const RANK_STYLES = ["text-sunset", "text-muted", "text-muted"];

export default async function LeaderboardPage(props: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sort = (SORTS.find((s) => s.key === searchParams.sort)?.key ?? "trust") as SortKey;

  // Badge counts can't be ordered on directly alongside RiderTrust fields, so
  // fetch riders with a trust snapshot and sort in code. The rider base here is
  // small enough that this is cheaper than a raw query.
  const riders = await prisma.rider.findMany({
    where: { trust: { isNot: null } },
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
      trust: true,
      _count: { select: { badges: true } },
      badges: {
        take: 4,
        orderBy: { awardedAt: "desc" },
        select: { id: true, badge: { select: { name: true, icon: true, tier: true } } },
      },
    },
    take: 200,
  });

  const ranked = riders
    .filter((rider) => rider.trust !== null)
    .sort((a, b) => {
      switch (sort) {
        case "miles":
          return (b.trust?.milesRidden ?? 0) - (a.trust?.milesRidden ?? 0);
        case "rides":
          return (b.trust?.eventsAttended ?? 0) - (a.trust?.eventsAttended ?? 0);
        case "badges":
          return b._count.badges - a._count.badges;
        default:
          return (b.trust?.score ?? 0) - (a.trust?.score ?? 0);
      }
    });

  return (
    <AppShell>
      <PageHeader
        icon={Trophy}
        title="Rider Standings"
        subtitle="Trust is earned by showing up when you said you would, arriving on time, and keeping your safety waiver current. It is not a popularity score."
      />

      <section className="page-shell">
        <div className="space-y-6">
          <nav className="flex flex-wrap gap-2" aria-label="Leaderboard sort">
            {SORTS.map((option) => (
              <Link
                key={option.key}
                href={`/leaderboard?sort=${option.key}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  sort === option.key
                    ? "border-sunset bg-sunset/10 text-sunset"
                    : "border-border text-muted hover:border-ink/30 hover:text-ink"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </nav>

          {ranked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Trophy className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">
                No rider standings yet. Trust is computed once riders start checking in to rides.
              </p>
            </div>
          ) : (
            <StaggerList className="space-y-2">
              {ranked.map((rider, index) => (
                <StaggerItem key={rider.id}>
                  <Link
                    href={`/r/${rider.handle}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft transition hover:border-sunset/40"
                  >
                    <span
                      className={`w-8 shrink-0 text-center font-display text-xl font-bold ${
                        RANK_STYLES[index] ?? "text-muted"
                      }`}
                    >
                      {index + 1}
                    </span>

                    {rider.avatarUrl ? (
                       
                      <img
                        src={rider.avatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-canvas text-xs font-bold text-muted">
                        {rider.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-ink">{rider.name}</span>
                        <span className="truncate text-xs text-muted">@{rider.handle}</span>
                        <TrustBadge level={rider.trust!.level as TrustLevel} score={rider.trust!.score} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {rider.trust!.eventsAttended} ride{rider.trust!.eventsAttended === 1 ? "" : "s"} ·{" "}
                        {rider.trust!.milesRidden.toLocaleString()} mi · {rider._count.badges} badge
                        {rider._count.badges === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="hidden shrink-0 gap-1 sm:flex">
                      {rider.badges.map((held) => (
                        <BadgeChip
                          key={held.id}
                          name={held.badge.name}
                          icon={held.badge.icon}
                          tier={held.badge.tier}
                          compact
                        />
                      ))}
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>
      </section>
    </AppShell>
  );
}
