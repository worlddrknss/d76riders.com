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

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="bg-asphalt px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{bike.name}</h3>
          {isPrimary && (
            <span className="rounded-full bg-sunset/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-sunset">Current</span>
          )}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sunset">Powered by {bike.make}</p>
      </div>

      <div className="flex items-center justify-center bg-canvas">
        {imageUrl ? (
          <img src={imageUrl} alt={bike.photos[0]?.caption || bike.name} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center text-muted">
            <Bike className="h-20 w-20 opacity-20" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border px-2 py-4">
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Year</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.year ?? "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Type</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.type ? bike.type.charAt(0) + bike.type.slice(1).toLowerCase() : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Make</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.make}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        <div className="border-b border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Engine Type</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.engineType || "—"}</p>
        </div>
        <div className="border-b border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Model</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.model || "—"}</p>
        </div>
        <div className="border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Displacement</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.displacement || "—"}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Bike Name</p>
          <p className="mt-0.5 text-sm font-medium text-sunset">{bike.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        <div className="border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Mods</p>
          <p className="mt-0.5 font-display text-lg font-bold text-asphalt">{bike._count.modifications}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Services</p>
          <p className="mt-0.5 font-display text-lg font-bold text-asphalt">{bike._count.serviceRecords}</p>
        </div>
      </div>

      <Link
        href={`/builds/${bike.id}`}
        className="block border-t border-border px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-sunset transition hover:bg-sunset/5"
      >
        View Build Timeline
      </Link>
    </article>
  );
}
