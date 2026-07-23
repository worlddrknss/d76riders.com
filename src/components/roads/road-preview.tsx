"use client";

import { MapPin, Mountain, Route as RouteIcon, Signal, Star } from "lucide-react";

type RoadPreviewProps = {
  name: string;
  description: string;
  difficulty: string;
  /** Object URL of the chosen cover photo, before upload. */
  imageUrl: string | null;
  riderName: string;
  riderHandle: string;
};

const DIFFICULTY_META: Record<string, { label: string; pill: string }> = {
  BEGINNER_FRIENDLY: { label: "Beginner friendly", pill: "bg-forest/10 text-forest" },
  INTERMEDIATE: { label: "Intermediate", pill: "bg-sunset/10 text-sunset" },
  SCENIC: { label: "Scenic", pill: "bg-sky-500/10 text-sky-600" },
};

/**
 * How the road will look in the directory grid, mirroring RoadCard so what an
 * owner frames here is what everyone else sees. The interaction is stripped —
 * no link, a plain <img> for the not-yet-uploaded blob — but the layout is the
 * card's, down to the branded placeholder when there's no photo yet.
 */
export function RoadPreview({ name, description, difficulty, imageUrl, riderName, riderHandle }: RoadPreviewProps) {
  const meta = difficulty ? DIFFICULTY_META[difficulty] : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="relative h-40 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="relative h-full w-full bg-linear-to-br from-asphalt via-asphalt to-[#242424]">
            <div className="route-lines absolute inset-0 opacity-40" aria-hidden="true" />
            <RouteIcon className="absolute left-4 top-4 h-6 w-6 text-white/70" aria-hidden="true" />
            <Mountain className="absolute -bottom-3 -right-2 h-24 w-24 text-white/5" aria-hidden="true" />
          </div>
        )}
        {meta ? (
          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider backdrop-blur ${
              imageUrl ? "bg-black/55 text-white" : meta.pill
            }`}
          >
            {meta.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg text-asphalt">{name.trim() || "Your road's name"}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
          {description.trim() || "The description you write will appear here."}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <RouteIcon className="h-3.5 w-3.5 text-sunset" />
            Distance from route
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5 text-sunset" />
            {meta?.label ?? "Any level"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-sunset" />
            Unrated
          </span>
        </div>

        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 text-sunset" />
          Shared by {riderName} (@{riderHandle})
        </p>
      </div>
    </article>
  );
}
