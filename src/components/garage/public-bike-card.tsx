import Link from "next/link";
import { Bike } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";

type PublicBikeData = {
  id: string;
  name: string;
  make: string;
  model: string | null;
  year: number | null;
  type: string | null;
  engineType: string | null;
  displacement: string | null;
  photos: { url: string; caption: string | null }[];
  _count: { modifications: number; serviceRecords: number };
};

export function PublicBikeCard({ bike, isPrimary = false }: { bike: PublicBikeData; isPrimary?: boolean }) {
  const imageUrl = bike.photos[0]?.url ? mediaUrl(bike.photos[0].url) : null;

  const specs = [
    bike.type ? bike.type.charAt(0) + bike.type.slice(1).toLowerCase() : null,
    bike.displacement,
    bike.year,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={bike.photos[0]?.caption || bike.name} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-canvas text-muted">
            <Bike className="h-16 w-16 opacity-20" />
          </div>
        )}
        {isPrimary && (
          <span className="absolute left-3 top-3 rounded-full bg-sunset px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-soft">Current</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-bold text-ink">{bike.name}</h3>
        <p className="mt-0.5 text-xs text-muted">{specs || bike.make}</p>

        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted">
          <span><strong className="font-semibold text-ink">{bike._count.modifications}</strong> mods</span>
          <span><strong className="font-semibold text-ink">{bike._count.serviceRecords}</strong> services</span>
          <Link href={`/builds/${bike.id}`} className="ml-auto font-bold text-[#cf5a26] hover:underline">
            Build &amp; mods →
          </Link>
        </div>
      </div>
    </article>
  );
}
