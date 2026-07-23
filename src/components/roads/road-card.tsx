import Image from "next/image";
import Link from "next/link";
import { MapPin, Mountain, Route as RouteIcon, Signal, Star } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";

export type RoadCardData = {
  slug: string;
  name: string;
  description: string | null;
  distanceMiles: number | null;
  difficulty: string | null;
  qualityScore: number | null;
  scenicRating: number | null;
  imageUrl: string | null;
  riderName: string;
  riderHandle: string;
  /** Distance from the viewer, when sorting nearest. */
  distanceAway: number | null;
};

const DIFFICULTY_META: Record<string, { label: string; pill: string }> = {
  BEGINNER_FRIENDLY: { label: "Beginner friendly", pill: "bg-forest/10 text-forest" },
  INTERMEDIATE: { label: "Intermediate", pill: "bg-sunset/10 text-sunset" },
  SCENIC: { label: "Scenic", pill: "bg-sky-500/10 text-sky-600" },
};

/**
 * A road in the directory grid.
 *
 * The banner is the whole point of the redesign: a road with no photo used to
 * render as text on a white card with nothing to anchor it, which is most of
 * the seeded roads. Now every card leads with a banner — the photo when there
 * is one, and otherwise a branded route-lines panel carrying the road icon and
 * the difficulty, so the grid reads as a set of places rather than a list.
 */
export function RoadCard({ road }: { road: RoadCardData }) {
  const image = mediaUrl(road.imageUrl);
  const difficulty = road.difficulty ? DIFFICULTY_META[road.difficulty] : null;
  const quality = road.qualityScore ?? road.scenicRating;

  return (
    <Link
      href={`/roads/${road.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative h-40 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={road.name}
            width={400}
            height={160}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="relative h-full w-full bg-linear-to-br from-asphalt via-asphalt to-[#242424]">
            <div className="route-lines absolute inset-0 opacity-40" aria-hidden="true" />
            <RouteIcon
              className="absolute left-4 top-4 h-6 w-6 text-white/70"
              aria-hidden="true"
            />
            <Mountain
              className="absolute -bottom-3 -right-2 h-24 w-24 text-white/5"
              aria-hidden="true"
            />
          </div>
        )}
        {difficulty ? (
          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider backdrop-blur ${
              image ? "bg-black/55 text-white" : difficulty.pill
            }`}
          >
            {difficulty.label}
          </span>
        ) : null}
        {road.distanceAway != null ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-sunset px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white">
            <MapPin className="h-3 w-3" />
            {Math.round(road.distanceAway)} mi
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg text-asphalt transition group-hover:text-sunset">{road.name}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
          {road.description || "No description yet."}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <RouteIcon className="h-3.5 w-3.5 text-sunset" />
            {road.distanceMiles ? `${road.distanceMiles} mi` : "Distance TBD"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5 text-sunset" />
            {difficulty?.label ?? "Any level"}
          </span>
          {quality != null ? (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-sunset text-sunset" />
              {quality.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
