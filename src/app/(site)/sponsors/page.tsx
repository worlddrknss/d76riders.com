import type { Metadata } from "next";
import type { SponsorTier } from "@prisma/client";
import { Store } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "Local businesses that support the District 76 Riders community — shops, gear, and food stops around Clarksville, Tennessee.",
  alternates: { canonical: "/sponsors" },
  openGraph: {
    title: "Sponsors — District 76 Riders",
    description: "The local businesses that support this community.",
  },
};

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<SponsorTier, string> = {
  PARTNER: "Partner",
  SUPPORTER: "Supporter",
  FRIEND: "Friend of the Community",
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
    <div>
      <PageHero
        image={siteImages.pageHeroes.sponsors}
        eyebrow="Community"
        title="Local Sponsors"
        description="Local businesses that support this community — the shops, stops, and people who look after riders around Clarksville. Worth your business."
      />

      <section className="page-shell">
        <div className="content-wrap">
          {sponsors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Store className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No sponsors listed yet.</p>
            </div>
          ) : (
            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((sponsor) => {
                const card = (
                  <>
                    <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-canvas p-3">
                      {sponsor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Store className="h-7 w-7 text-muted/50" />
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-semibold text-ink">{sponsor.name}</h2>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-muted">
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

                const cardClass =
                  "block h-full rounded-xl border border-border bg-surface p-4 shadow-soft transition hover:border-sunset/40";

                return (
                  <StaggerItem key={sponsor.id}>
                    {sponsor.websiteUrl ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        // Sponsor URLs are outbound links to third parties — don't leak
                        // the referrer or pass any ranking signal.
                        rel="noopener noreferrer nofollow"
                        className={cardClass}
                      >
                        {card}
                      </a>
                    ) : (
                      <div className={cardClass}>{card}</div>
                    )}
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </div>
      </section>
    </div>
  );
}
