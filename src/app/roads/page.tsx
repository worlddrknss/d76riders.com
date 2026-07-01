import Link from "next/link";
import { MapPin, Route as RouteIcon, Signal, Star } from "lucide-react";

import { CreateRoadForm } from "@/components/roads/create-road-form";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

function difficultyLabel(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "Not specified";
}

export default async function RoadsPage() {
  const currentUser = await getCurrentUser();
  const roads = await prisma.road.findMany({
    include: {
      rider: { select: { handle: true, name: true } },
      galleryItems: { orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: [{ scenicRating: "desc" }, { createdAt: "desc" }],
  });

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Featured Roads</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Build and Share Featured Roads</h1>
          <p className="mt-2 text-sm text-muted">Create rider-owned road entries with saved route geometry and public road notes.</p>
        </div>

        {currentUser ? (
          <CreateRoadForm />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted shadow-soft">
            Sign in to create and manage your own featured roads.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roads.map((road) => (
            <article key={road.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              {road.galleryItems[0]?.url ? <img src={mediaUrl(road.galleryItems[0].url)} alt={road.galleryItems[0].caption || road.name} className="h-44 w-full object-cover" /> : null}
              <div className="p-5">
                <Link href={`/roads/${road.slug}`} className="font-display text-lg font-semibold text-asphalt hover:text-sunset">{road.name}</Link>
                <p className="mt-2 text-sm text-muted">{road.description || "No road description yet."}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5 text-sunset" />{road.distanceMiles ? `${road.distanceMiles} miles` : "Distance TBD"}</span>
                  <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{difficultyLabel(road.difficulty)}</span>
                  <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sunset" />{road.scenicRating ? road.scenicRating.toFixed(1) : "N/A"}</span>
                </div>
                <p className="mt-3 text-xs text-muted inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-sunset" />Shared by {road.rider.name} (@{road.rider.handle})</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
