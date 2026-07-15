import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike } from "lucide-react";

import { PublicBikeCard } from "@/components/garage/public-bike-card";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const rider = await prisma.rider.findUnique({
    where: { handle },
    select: { name: true, handle: true },
  });
  if (!rider) return { title: "Rider Not Found" };

  return {
    title: `${rider.name}'s Garage`,
    description: `Check out the bikes in ${rider.name}'s garage on District 76 Riders.`,
    alternates: { canonical: `/garage/${rider.handle}` },
  };
}

export default async function PublicGaragePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const rider = await prisma.rider.findUnique({
    where: { handle },
    select: {
      name: true,
      handle: true,
      avatarUrl: true,
      primaryBikeId: true,
      bikes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          make: true,
          name: true,
          model: true,
          year: true,
          type: true,
          engineType: true,
          displacement: true,
          photos: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { url: true, caption: true },
          },
          _count: {
            select: { modifications: true, serviceRecords: true },
          },
        },
      },
    },
  });

  if (!rider) {
    notFound();
  }

  const avatar = mediaUrl(rider.avatarUrl);

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          {avatar ? (
            <img src={avatar} alt={rider.name} className="h-12 w-12 rounded-full border-2 border-sunset/30 object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sunset/10 font-display text-lg font-bold text-sunset">
              {rider.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Garage</p>
            <h1 className="font-display text-3xl font-semibold text-ink">
              <Link href={`/r/${rider.handle}`} className="hover:text-sunset transition-colors">
                {rider.name}
              </Link>
              &apos;s Bikes
            </h1>
          </div>
        </div>

        {rider.bikes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Bike className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">No bikes in the garage yet.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rider.bikes.map((bike) => (
              <PublicBikeCard key={bike.id} bike={bike} isPrimary={bike.id === rider.primaryBikeId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
