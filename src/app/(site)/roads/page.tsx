import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Route as RouteIcon, Signal, Star } from "lucide-react";

import { CreateRoadDialog } from "@/components/roads/create-road-dialog";
import { RoadFilters } from "@/components/roads/road-filters";
import { PageHero } from "@/components/layout/page-hero";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Scenic Motorcycle Roads",
  description:
    "Discover the best motorcycle roads in Tennessee. Community-rated scenic routes, twisties, and cruising roads shared by District 76 Riders.",
  alternates: { canonical: "/roads" },
  openGraph: {
    images: OG_IMAGE,
    title: "Scenic Roads — District 76 Riders",
    description: "Community-rated motorcycle roads and scenic routes across Tennessee.",
  },
};

function difficultyLabel(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "Not specified";
}

type RoadsPageProps = {
  searchParams: Promise<{ q?: string; difficulty?: string; sort?: string }>;
};

export default async function RoadsPage({ searchParams }: RoadsPageProps) {
  const { q, difficulty, sort } = await searchParams;
  const currentUser = await getCurrentUser();

  const orderBy = sort === "newest"
    ? [{ createdAt: "desc" as const }]
    : sort === "distance"
      ? [{ distanceMiles: "desc" as const }]
      : [{ scenicRating: "desc" as const }, { createdAt: "desc" as const }];

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (difficulty) {
    where.difficulty = difficulty;
  }

  const roads = await prisma.road.findMany({
    where,
    include: {
      rider: { select: { handle: true, name: true } },
      galleryItems: { orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy,
  });

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.roads}
        eyebrow="Featured Roads"
        title="Rider-Curated Roads"
        description="Discover the best roads in Tennessee. Community-shared routes with scenic ratings, difficulty levels, and saved GPS geometry."
        actions={currentUser ? <CreateRoadDialog /> : undefined}
      />

      <section className="page-shell">
        <div className="content-wrap space-y-6">
          <RoadFilters />

          {roads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <p className="text-sm text-muted">No roads found matching your filters.</p>
            </div>
          ) : (
            <StaggerList className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roads.map((road) => (
                <StaggerItem key={road.id}>
                <Link href={`/roads/${road.slug}`} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
                  {road.galleryItems[0]?.url ? <Image src={mediaUrl(road.galleryItems[0].url)} alt={road.galleryItems[0].caption || road.name} width={400} height={176} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" /> : null}
                  <div className="p-5">
                    <p className="font-display text-lg font-semibold text-asphalt group-hover:text-sunset">{road.name}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{road.description || "No road description yet."}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5 text-sunset" />{road.distanceMiles ? `${road.distanceMiles} miles` : "Distance TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{difficultyLabel(road.difficulty)}</span>
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sunset" />{road.scenicRating ? road.scenicRating.toFixed(1) : "N/A"}</span>
                    </div>
                    <p className="mt-3 text-xs text-muted inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-sunset" />Shared by {road.rider.name} (@{road.rider.handle})</p>
                  </div>
                </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>
      </section>
    </div>
  );
}
