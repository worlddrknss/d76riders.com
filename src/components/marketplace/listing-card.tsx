import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";

import { CATEGORY_LABEL, formatPrice } from "@/lib/marketplace";
import { mediaUrl } from "@/lib/media-url";
import type { ListingCategory } from "@prisma/client";

export type ListingCardData = {
  id: string;
  title: string;
  priceCents: number;
  category: ListingCategory;
  location: string | null;
  sold: boolean;
  imageUrl: string | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const image = listing.imageUrl ? mediaUrl(listing.imageUrl) : null;
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] w-full bg-canvas">
        {image ? (
          <img src={image} alt={listing.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {listing.sold ? (
          <span className="absolute left-2 top-2 rounded-full bg-asphalt px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">Sold</span>
        ) : (
          <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-asphalt backdrop-blur">{CATEGORY_LABEL[listing.category]}</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-lg font-bold text-ink">{formatPrice(listing.priceCents)}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink group-hover:text-sunset">{listing.title}</p>
        {listing.location ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3 text-sunset" />{listing.location}</p>
        ) : null}
      </div>
    </Link>
  );
}
