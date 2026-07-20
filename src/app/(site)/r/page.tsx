import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import { Bike, MapPin, Users, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Riders — Meet the Community",
  description:
    "Meet the riders of District 76 — all bikes, all skill levels. Motorcycle riders across Tennessee who show up for good roads and good people.",
  alternates: { canonical: "/r" },
  openGraph: {
    images: OG_IMAGE,
    title: "Our Riders — District 76 Riders",
    description: "The people behind the handlebars.",
  },
};

export default async function RidersPage() {
  const riders = await prisma.rider.findMany({
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
      coverUrl: true,
      location: true,
      yearsRiding: true,
      primaryBikeId: true,
      bikes: {
        select: { id: true, make: true, model: true, name: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const riderIds = riders.map((rider) => rider.id);
  const [hostedEvents, rsvpEvents] = await Promise.all([
    prisma.rideEvent.findMany({
      where: { hostId: { in: riderIds } },
      select: { hostId: true, id: true },
    }),
    prisma.rsvp.findMany({
      where: { riderId: { in: riderIds }, status: "GOING" },
      select: { riderId: true, eventId: true },
    }),
  ]);

  const eventSetsByRider = new Map<string, Set<string>>();
  for (const riderId of riderIds) {
    eventSetsByRider.set(riderId, new Set<string>());
  }

  for (const event of hostedEvents) {
    eventSetsByRider.get(event.hostId)?.add(event.id);
  }

  for (const rsvp of rsvpEvents) {
    eventSetsByRider.get(rsvp.riderId)?.add(rsvp.eventId);
  }

  return (
    <AppShell>
      <PageHeader
        icon={Users}
        title="Rider Directory"
        subtitle="Founded in Clarksville, TN and open to riders wherever the road goes. All bikes, all riders, one community."
      />

      {/* RIDER GRID */}
      <StaggerList className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3">
        {riders.map((rider) => {
            const avatar = mediaUrl(rider.avatarUrl);
            // No stock fallback — borrowing a hero shot reads as someone else's
            // bike. Riders without a cover get a plain dark fill instead.
            const cover = mediaUrl(rider.coverUrl);
            const bikeLabel = (() => {
              const primary = rider.primaryBikeId ? rider.bikes.find((b) => b.id === rider.primaryBikeId) : null;
              const displayBike = primary || rider.bikes[0];
              if (!displayBike) return "No bike listed";
              return displayBike.name || `${displayBike.make} ${displayBike.model ?? ""}`.trim();
            })();
            const ridesCount = eventSetsByRider.get(rider.id)?.size ?? 0;
            return (
              <StaggerItem key={rider.handle}>
                <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <div className="relative h-28 bg-asphalt">
                  {cover && (
                    <div
                      className="h-full w-full bg-cover bg-center opacity-60"
                      style={{ backgroundImage: `url(${cover})` }}
                    />
                  )}
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
                    <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />{ridesCount} rides</p>
                    {rider.yearsRiding != null && (
                      <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />{rider.yearsRiding} years riding</p>
                    )}
                    {rider.location && (
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />{rider.location}</p>
                    )}
                  </div>
                  <Link
                    href={`/r/${rider.handle}`}
                    className="mt-5 block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-semibold text-asphalt hover:border-asphalt"
                  >
                    View Profile
                  </Link>
                </div>
              </article>
              </StaggerItem>
            );
          })}
      </StaggerList>

      {/* TRUST STRIP */}
      <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
        <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Rider-first community structure</p>
        <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />Bike diversity, one shared culture</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />Founded in Clarksville, riding everywhere</p>
      </div>
    </AppShell>
  );
}
