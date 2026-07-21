import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, ShoppingBag } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ListingCard } from "@/components/marketplace/listing-card";
import { OG_IMAGE } from "@/lib/og";
import { CATEGORY_LABEL } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ListingCategory, type Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy and sell bikes, parts, and gear with riders in the District 76 community.",
  alternates: { canonical: "/marketplace" },
  openGraph: { images: OG_IMAGE, title: "Marketplace — District 76 Riders", description: "Rider-to-rider bikes, parts, and gear." },
};

const CATEGORIES = [{ value: "", label: "All" }, ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))];

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sold?: string }>;
}) {
  const { q, category, sold } = await searchParams;
  const currentUser = await getCurrentUser();

  const query = q?.trim() || "";
  const cat = category && category in CATEGORY_LABEL ? (category as ListingCategory) : null;
  const showSold = sold === "1";

  const where: Prisma.ListingWhereInput = {
    status: showSold ? "SOLD" : "ACTIVE",
    ...(cat ? { category: cat } : {}),
    ...(query
      ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] }
      : {}),
  };

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 48,
    select: {
      id: true,
      title: true,
      priceCents: true,
      category: true,
      location: true,
      status: true,
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
    },
  });

  return (
    <AppShell>
      <PageHeader
        icon={ShoppingBag}
        title="Marketplace"
        subtitle="Rider-to-rider bikes, parts, and gear. Message the seller directly to make a deal."
        action={
          currentUser ? (
            <Link href="/marketplace/new" className="inline-flex items-center gap-2 rounded-md bg-sunset px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#cf5a26]">
              <Plus className="h-4 w-4" /> Post
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <form method="GET" action="/marketplace" className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-50 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search listings..."
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-sunset focus:outline-none"
            />
          </div>
          <select name="category" defaultValue={cat ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select name="sold" defaultValue={showSold ? "1" : ""} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none">
            <option value="">For sale</option>
            <option value="1">Sold</option>
          </select>
          <button type="submit" className="rounded-lg bg-asphalt px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-asphalt/80">Search</button>
        </form>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted shadow-soft">
            Nothing listed here yet.{" "}
            {currentUser ? <Link href="/marketplace/new" className="font-semibold text-sunset hover:underline">Post the first listing.</Link> : "Log in to post the first one."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={{
                  id: l.id,
                  title: l.title,
                  priceCents: l.priceCents,
                  category: l.category,
                  location: l.location,
                  sold: l.status === "SOLD",
                  imageUrl: l.images[0]?.url ?? null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
