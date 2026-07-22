import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import { Camera, ImageOff, Images } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { DEFAULT_TIMEZONE, formatEventDate } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery — Ride Photos & Community Moments",
  description:
    "Browse photos from District 76 group rides, meetups, and road adventures.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    images: OG_IMAGE,
    title: "Gallery — District 76 Riders",
    description: "Photos from rides, meetups, and the road.",
  },
};

export default async function GalleryPage() {
  // The latest event galleries — one card per event that has community photos,
  // ordered by the most recent upload.
  const groups = await prisma.galleryItem.groupBy({
    by: ["eventId"],
    where: { eventId: { not: null }, riderId: { not: null } },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 9,
  });

  const eventIds = groups.map((g) => g.eventId).filter((id): id is string => id != null);
  const events = eventIds.length
    ? await prisma.rideEvent.findMany({
        where: { id: { in: eventIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          timezone: true,
          galleryItems: {
            where: { riderId: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { url: true, caption: true },
          },
        },
      })
    : [];
  const eventMap = new Map(events.map((e) => [e.id, e]));

  const galleries = groups
    .map((g) => {
      const event = g.eventId ? eventMap.get(g.eventId) : undefined;
      if (!event) return null;
      return { event, count: g._count._all, cover: event.galleryItems[0] ?? null };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <AppShell>
      <PageHeader
        icon={Images}
        eyebrow="Community"
        title="District 76 Moments"
        subtitle="Rides, road stops, and the people who make the Clarksville motorcycle community worth showing up for."
      />

      <section className="py-10">
        <div className="w-full px-4 py-16 sm:px-6 lg:px-8">
          {galleries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <ImageOff className="mx-auto h-8 w-8 text-muted/50" />
              <h2 className="mt-3 font-display text-xl font-semibold text-ink">No ride photos yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                After a ride, attendees can add photos on the event page. The latest galleries show up here.
              </p>
              <Link href="/events" className="mt-5 inline-flex rounded-md bg-sunset px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#cf5a26]">
                Browse events
              </Link>
            </div>
          ) : (
            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleries.map(({ event, count, cover }) => (
                <StaggerItem key={event.id}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group block overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift"
                  >
                    <div className="relative h-56 w-full overflow-hidden bg-asphalt sm:h-64">
                      {cover ? (
                        <img
                          src={mediaUrl(cover.url)}
                          alt={cover.caption ?? event.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/40">
                          <Camera className="h-10 w-10" />
                        </div>
                      )}
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-asphalt/80 px-2.5 py-1 text-xs font-semibold text-white">
                        <Camera className="h-3.5 w-3.5" />
                        {count}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-asphalt/90 to-transparent p-4">
                        <p className="font-display text-lg font-semibold text-white">{event.title}</p>
                        <p className="text-xs text-white/70">
                          {formatEventDate(event.startsAt, event.timezone ?? DEFAULT_TIMEZONE)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="w-full px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sunset">Rode with us?</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">Share Your Ride Shots</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              Add your photos to any ride from its event page — you&apos;re credited on every one.
            </p>
            <Link href="/events" className="mt-6 inline-flex rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf5a26]">
              Find a ride
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
