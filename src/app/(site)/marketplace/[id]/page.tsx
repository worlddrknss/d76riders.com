import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, MessageSquare } from "lucide-react";

import { messageSellerAction } from "@/app/(site)/marketplace/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ListingOwnerActions } from "@/components/marketplace/listing-owner-actions";
import { CATEGORY_LABEL, CONDITION_LABEL, formatPrice } from "@/lib/marketplace";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function getListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, userId: true, name: true, handle: true, avatarUrl: true } },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing not found" };
  return {
    title: `${listing.title} — ${formatPrice(listing.priceCents)}`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `/marketplace/${id}` },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const currentUser = await getCurrentUser();
  const isOwner = Boolean(currentUser && currentUser.id === listing.seller.userId);
  // A removed listing is only visible to its owner.
  if (listing.status === "REMOVED" && !isOwner) notFound();

  const sold = listing.status === "SOLD";
  const cover = listing.images[0]?.url ? mediaUrl(listing.images[0].url) : null;

  return (
    <AppShell>
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Marketplace
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-canvas">
            {cover ? (
              <img src={cover} alt={listing.title} className="max-h-[32rem] w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center text-muted">No photos</div>
            )}
            {sold ? (
              <span className="absolute left-3 top-3 rounded-full bg-asphalt px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">Sold</span>
            ) : null}
          </div>
          {listing.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {listing.images.map((img) => (
                <div key={img.id} className="aspect-square overflow-hidden rounded-lg border border-border bg-canvas">
                  <img src={mediaUrl(img.url)} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Details */}
        <div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <p className="font-display text-3xl font-bold text-ink">{formatPrice(listing.priceCents)}</p>
            <h1 className="mt-1 font-display text-xl font-bold text-ink">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-canvas px-2.5 py-1 font-semibold text-asphalt">{CATEGORY_LABEL[listing.category]}</span>
              <span className="rounded-full bg-canvas px-2.5 py-1 font-semibold text-asphalt">{CONDITION_LABEL[listing.condition]}</span>
              {listing.location ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 font-semibold text-asphalt"><MapPin className="h-3 w-3 text-sunset" />{listing.location}</span>
              ) : null}
            </div>

            {/* Seller */}
            <div className="mt-5 border-t border-border pt-4">
              <Link href={`/r/${listing.seller.handle}`} className="flex items-center gap-3">
                {mediaUrl(listing.seller.avatarUrl) ? (
                  <img src={mediaUrl(listing.seller.avatarUrl) ?? ""} alt={listing.seller.name} className="h-10 w-10 rounded-full border border-border object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset/10 text-sm font-bold text-sunset">{listing.seller.name.charAt(0)}</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{listing.seller.name}</p>
                  <p className="truncate text-xs text-muted">@{listing.seller.handle}</p>
                </div>
              </Link>

              {isOwner ? (
                <div className="mt-4">
                  <ListingOwnerActions listingId={listing.id} sold={sold} />
                </div>
              ) : currentUser ? (
                <form action={messageSellerAction.bind(null, listing.id)} className="mt-4">
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]">
                    <MessageSquare className="h-4 w-4" /> Message seller
                  </button>
                </form>
              ) : (
                <Link href="/login" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]">
                  Log in to contact
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Details</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{listing.description}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
