import type { Metadata } from "next";
import type { SponsorTier } from "@prisma/client";
import { Store } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Partners | District 76 Riders",
  description:
    "Local businesses that support District 76 Riders — shops, gear, and food stops around Clarksville, Tennessee.",
};

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<SponsorTier, string> = {
  PARTNER: "Partner",
  SUPPORTER: "Supporter",
  FRIEND: "Friend of the Club",
};

export default async function SponsorsPage() {
  const sponsors = await prisma.sponsor.findMany({
    where: { active: true },
    // Enum order is PARTNER, SUPPORTER, FRIEND — top tier first.
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      tier: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Community</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Partners</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Local businesses that back this club. Give them your business — they give us theirs.
        </p>
      </header>

      {sponsors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-canvas p-12 text-center">
          <Store className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">No partners listed yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((sponsor) => {
            const card = (
              <>
                <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-surface p-3">
                  {sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Store className="h-7 w-7 text-muted" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-ink">{sponsor.name}</h2>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-muted">
                      {TIER_LABEL[sponsor.tier]}
                    </span>
                  </div>
                  {sponsor.description ? (
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{sponsor.description}</p>
                  ) : null}
                  {sponsor._count.events > 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      Supported {sponsor._count.events} ride{sponsor._count.events === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              </>
            );

            return sponsor.websiteUrl ? (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl}
                target="_blank"
                // Sponsor URLs are outbound links to third parties — don't leak
                // the referrer or pass any ranking signal.
                rel="noopener noreferrer nofollow"
                className="rounded-xl border border-border bg-canvas p-4 transition hover:border-ink/30"
              >
                {card}
              </a>
            ) : (
              <div key={sponsor.id} className="rounded-xl border border-border bg-canvas p-4">
                {card}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
