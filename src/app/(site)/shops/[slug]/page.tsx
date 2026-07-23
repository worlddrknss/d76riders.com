import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Phone } from "lucide-react";

import { ShopReviews, Stars, type ShopReview } from "@/components/sponsors/shop-reviews";
import { AppShell } from "@/components/layout/app-shell";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await prisma.sponsor.findUnique({ where: { slug }, select: { name: true } });
  return { title: shop ? `${shop.name} — Shops | D76 Riders` : "Shop — D76 Riders" };
}

export default async function ShopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const shop = await prisma.sponsor.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      category: true,
      address: true,
      phone: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          riderId: true,
          rider: { select: { name: true, handle: true } },
        },
      },
    },
  });

  if (!shop) notFound();

  const currentUser = await getCurrentUser();
  const rider = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const average =
    shop.reviews.length > 0
      ? shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
      : 0;

  const reviews: ShopReview[] = shop.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    riderName: r.rider.name,
    riderHandle: r.rider.handle,
    isMine: r.riderId === rider?.id,
  }));

  const myReview = rider ? shop.reviews.find((r) => r.riderId === rider.id) ?? null : null;
  const canModerate = Boolean(
    currentUser?.roles.includes("ADMINISTRATOR") || currentUser?.roles.includes("MODERATOR"),
  );
  const logo = mediaUrl(shop.logoUrl);

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/shops" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-sunset hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Shops &amp; Sponsors
        </Link>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-4">
            {logo ? (
              <img src={logo} alt={shop.name} className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              {shop.category && (
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-sunset">
                  {shop.category.replace(/_/g, " ").toLowerCase()}
                </p>
              )}
              <h1 className="font-display text-2xl text-ink">{shop.name}</h1>
              {shop.reviews.length > 0 && (
                <span className="mt-1 inline-flex items-center gap-2 text-sm text-muted">
                  <Stars value={average} />
                  <span className="font-semibold text-ink">{average.toFixed(1)}</span>
                  <span>({shop.reviews.length})</span>
                </span>
              )}
            </div>
          </div>

          {shop.description && <p className="mt-4 text-sm leading-relaxed text-ink/80">{shop.description}</p>}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {shop.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-sunset" />
                {shop.address}
              </span>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Phone className="h-4 w-4 text-sunset" />
                {shop.phone}
              </a>
            )}
            {shop.websiteUrl && (
              <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sunset hover:underline">
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>

        <ShopReviews
          sponsorId={shop.id}
          reviews={reviews}
          average={average}
          canReview={Boolean(rider)}
          canModerate={canModerate}
          myReview={myReview ? { rating: myReview.rating, body: myReview.body } : null}
        />
      </div>
    </AppShell>
  );
}
