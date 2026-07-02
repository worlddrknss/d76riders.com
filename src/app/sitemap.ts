import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/roads`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/riders`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/news`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/gallery`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Dynamic: Events
  const events = await prisma.rideEvent.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${siteUrl}/events/${event.slug}`,
    lastModified: event.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Dynamic: Roads
  const roads = await prisma.road.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const roadPages: MetadataRoute.Sitemap = roads.map((road) => ({
    url: `${siteUrl}/roads/${road.slug}`,
    lastModified: road.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Dynamic: Riders
  const riders = await prisma.rider.findMany({
    select: { handle: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const riderPages: MetadataRoute.Sitemap = riders.map((rider) => ({
    url: `${siteUrl}/riders/${rider.handle}`,
    lastModified: rider.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...eventPages, ...roadPages, ...riderPages];
}
