import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Store, ExternalLink } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { SubmitSponsorDialog } from "@/components/sponsors/submit-sponsor-dialog";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  SHOP_CATEGORY_LABEL,
  TIER_LABEL,
  parseShopCategory,
} from "@/lib/shops";

export const metadata: Metadata = {
  title: "Shops & Sponsors",
  description:
    "Motorcycle shops, tires, gear, and service around Clarksville and across Tennessee, recommended by District 76 riders, plus the businesses that back the community.",
  alternates: { canonical: "/shops" },
  openGraph: {
    title: "Shops & Sponsors | District 76 Riders",
    description:
      "Where riders around here actually go, and the businesses that back us.",
  },
};

export const dynamic = "force-dynamic";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tier?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const category = parseShopCategory(params.category);
  // One page, because two nearly-empty ones would be worse and a sponsor is
  // better off in front of riders looking for a mechanic than on a wall of its
  // own. Sponsors stay filterable for when someone specifically wants them.
  const sponsorsOnly = params.tier === "sponsor";

  const shops = await prisma.sponsor.findMany({
    // APPROVED only: a submission is never public until a human has agreed to it.
    where: {
      active: true,
      status: "APPROVED",
      ...(category ? { category } : {}),
      ...(sponsorsOnly ? { tier: { not: null } } : {}),
    },
    // Businesses that back us first, then alphabetical. Nulls last, so a plain
    // listing never outranks a sponsor.
    orderBy: [{ tier: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      tier: true,
      category: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
    },
  });

  // Only offer a filter for categories that actually have something behind them.
  // A directory this size cannot afford tabs that lead to empty rooms.
  const counts = await prisma.sponsor.groupBy({
    by: ["category"],
    where: { active: true, status: "APPROVED", category: { not: null } },
    _count: { _all: true },
  });
  const sponsorCount = await prisma.sponsor.count({
    where: { active: true, status: "APPROVED", tier: { not: null } },
  });

  const available = counts
    .filter((row) => row.category !== null)
    .map((row) => ({ category: row.category!, count: row._count._all }))
    .sort((a, b) =>
      SHOP_CATEGORY_LABEL[a.category].localeCompare(
        SHOP_CATEGORY_LABEL[b.category],
      ),
    );

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.sponsors}
        eyebrow="Community"
        title="Shops & Sponsors"
        description="Where riders around here actually go for tires, service, and gear, and the local businesses that back this community. Recommended by riders, not by whoever paid the most."
        actions={currentUser ? <SubmitSponsorDialog /> : undefined}
      />

      <section className="page-shell">
        <div className="content-wrap">
          {available.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-1.5">
              <Link
                href="/shops"
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  category === null && !sponsorsOnly
                    ? "border-sunset bg-sunset/10 text-sunset"
                    : "border-border text-muted hover:border-sunset/50 hover:text-ink"
                }`}
              >
                All
              </Link>
              {sponsorCount > 0 ? (
                <Link
                  href="/shops?tier=sponsor"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    sponsorsOnly
                      ? "border-sunset bg-sunset/10 text-sunset"
                      : "border-border text-muted hover:border-sunset/50 hover:text-ink"
                  }`}
                >
                  Sponsors
                  <span className="text-[0.65rem] tabular-nums opacity-70">
                    {sponsorCount}
                  </span>
                </Link>
              ) : null}
              {available.map(({ category: c, count }) => (
                <Link
                  key={c}
                  href={`/shops?category=${c.toLowerCase()}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    category === c
                      ? "border-sunset bg-sunset/10 text-sunset"
                      : "border-border text-muted hover:border-sunset/50 hover:text-ink"
                  }`}
                >
                  {SHOP_CATEGORY_LABEL[c]}
                  <span className="text-[0.65rem] tabular-nums opacity-70">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {shops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Store className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">
                {sponsorsOnly
                  ? "No sponsors yet."
                  : category
                    ? `Nothing listed under ${SHOP_CATEGORY_LABEL[category]} yet.`
                    : "Nothing listed yet. If you know somewhere that looks after riders, put it forward."}
              </p>
            </div>
          ) : (
            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <StaggerItem key={shop.id}>
                  <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                    {/* The logo gets a band of its own, the way gear photos do.
                        Most shop logos are drawn for a white background, so the
                        band stays white and the logo is contained rather than
                        cropped — a wordmark cropped to a square is unreadable. */}
                    <div className="relative flex h-32 shrink-0 items-center justify-center border-b border-border bg-white p-5">
                      {shop.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Store className="h-9 w-9 text-muted/30" />
                      )}
                      {shop.tier ? (
                        <span className="absolute right-3 top-3 rounded-full border border-sunset/40 bg-sunset/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                          {TIER_LABEL[shop.tier]}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-base font-semibold text-ink">
                        {shop.name}
                      </h2>
                      {shop.category ? (
                        <p className="text-xs font-medium text-sunset">
                          {SHOP_CATEGORY_LABEL[shop.category]}
                        </p>
                      ) : null}

                      {shop.description ? (
                        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">
                          {shop.description}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}

                      <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                        {shop.address ? (
                          <p className="flex items-start gap-2 text-xs text-muted">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sunset" />
                            <span>{shop.address}</span>
                          </p>
                        ) : null}
                        {shop.phone ? (
                          <a
                            href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`}
                            className="flex items-center gap-2 text-xs text-muted transition hover:text-sunset"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-sunset" />
                            {shop.phone}
                          </a>
                        ) : null}
                        <div className="flex flex-wrap gap-3 pt-1">
                          {shop.lat != null && shop.lng != null ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              Directions
                            </a>
                          ) : null}
                          {shop.websiteUrl ? (
                            <a
                              href={shop.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Website
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>
      </section>
    </div>
  );
}
