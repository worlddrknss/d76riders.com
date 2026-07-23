import { Camera, Flag, Route as RouteIcon, Users } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";

/**
 * Post-ride recap — a celebratory summary card shown on completed events,
 * computed from attendance, distance, the route, and the community gallery.
 */
export function EventRecap({
  title,
  riders,
  miles,
  photos,
  hasRoute,
  coverUrl,
}: {
  title: string;
  riders: number;
  miles: number | null;
  photos: number;
  hasRoute: boolean;
  coverUrl: string | null;
}) {
  const stats = [
    { icon: Users, value: riders.toLocaleString(), label: riders === 1 ? "rider" : "riders" },
    ...(miles ? [{ icon: RouteIcon, value: miles.toLocaleString(), label: "miles" }] : []),
    { icon: Camera, value: photos.toLocaleString(), label: photos === 1 ? "photo" : "photos" },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="relative bg-asphalt px-6 py-5">
        {coverUrl && (
          <img src={mediaUrl(coverUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sunset">
            <Flag className="h-3.5 w-3.5" />
            Ride recap
          </p>
          <h2 className="mt-1 font-display text-2xl text-white">{title} is in the books</h2>
          <p className="mt-1 text-sm text-white/70">
            Thanks to everyone who rode. Here&apos;s how it went{hasRoute ? ", route and all" : ""}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
              <Icon className="h-5 w-5 text-sunset" />
              <span className="font-display text-2xl text-ink">{s.value}</span>
              <span className="text-xs uppercase tracking-wide text-muted">{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
