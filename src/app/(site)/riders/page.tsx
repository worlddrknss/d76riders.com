import type { Metadata } from "next";
import Link from "next/link";
import { Bike, MapPin, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

export const metadata: Metadata = {
  title: "Riders — Meet the Community",
  description:
    "Meet the riders of District 76 — motorcycle enthusiasts in Clarksville, Tennessee who share a passion for the open road.",
  alternates: { canonical: "/riders" },
  openGraph: {
    title: "Our Riders — District 76 Riders",
    description: "The people behind the handlebars in Clarksville, TN.",
  },
};

export default async function RidersPage() {
  const riders = await prisma.rider.findMany({
    select: {
      handle: true,
      name: true,
      avatarUrl: true,
      coverUrl: true,
      location: true,
      yearsRiding: true,
      bikes: {
        select: { make: true, model: true },
        take: 1,
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.members}
        eyebrow="Riders"
        title="Rider Directory"
        description="Meet riders across Clarksville and surrounding areas. Everyone here is part of the same local road community."
      />

      {/* RIDER GRID */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {riders.map((rider) => {
            const avatar = mediaUrl(rider.avatarUrl);
            const cover = mediaUrl(rider.coverUrl) || siteImages.hero;
            const bikeLabel = rider.bikes[0] ? `${rider.bikes[0].make} ${rider.bikes[0].model ?? ""}`.trim() : "No bike listed";
            return (
              <article key={rider.handle} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <div className="relative h-28 bg-asphalt">
                  <div
                    className="h-full w-full bg-cover bg-center opacity-60"
                    style={{ backgroundImage: `url(${cover})` }}
                  />
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={rider.name}
                      className="absolute -bottom-6 left-5 h-14 w-14 rounded-full border-4 border-surface object-cover"
                    />
                  ) : (
                    <span className="absolute -bottom-6 left-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-sunset text-base font-bold text-white">
                      {rider.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="px-5 pb-5 pt-9">
                  <h2 className="font-display text-lg font-bold tracking-tight text-asphalt">{rider.name}</h2>
                  <p className="text-sm text-muted">{bikeLabel}</p>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    {rider.yearsRiding != null && (
                      <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />{rider.yearsRiding} years riding</p>
                    )}
                    {rider.location && (
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />{rider.location}</p>
                    )}
                  </div>
                  <Link
                    href={`/riders/${rider.handle}`}
                    className="mt-5 block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-semibold text-asphalt hover:border-asphalt"
                  >
                    View Profile
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Rider-first community structure</p>
            <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />Bike diversity, one shared culture</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />Clarksville-centered riding network</p>
          </div>
        </div>
      </section>
    </div>
  );
}
