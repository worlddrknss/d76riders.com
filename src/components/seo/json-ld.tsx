import { socialLinks } from "@/data/community";

type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "District 76 Riders",
    url: siteUrl,
    logo: `${siteUrl}/images/hero/home.webp`,
    description:
      "Motorcycle riding community based in Clarksville, Tennessee. Group rides, scenic roads, and rider connections.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Clarksville",
      addressRegion: "TN",
      addressCountry: "US",
    },
    sameAs: [socialLinks.facebookGroup],
  };
}

export function eventJsonLd(event: {
  title: string;
  slug: string;
  description: string | null;
  date: Date;
  location: string | null;
  imageUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: `${siteUrl}/events/${event.slug}`,
    startDate: event.date.toISOString(),
    description: event.description || `Motorcycle ride event organized by District 76 Riders`,
    location: event.location
      ? { "@type": "Place", name: event.location }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: "District 76 Riders",
      url: siteUrl,
    },
    ...(event.imageUrl && { image: event.imageUrl }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };
}

export function roadJsonLd(road: {
  name: string;
  slug: string;
  description: string | null;
  distanceMiles: number | null;
  scenicRating: number | null;
  totalRatings: number;
  imageUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: road.name,
    url: `${siteUrl}/roads/${road.slug}`,
    description: road.description || `Scenic motorcycle road curated by District 76 Riders`,
    ...(road.distanceMiles && {
      geo: { "@type": "GeoShape", description: `${road.distanceMiles} miles` },
    }),
    ...(road.scenicRating && road.totalRatings > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: road.scenicRating.toFixed(1),
        bestRating: "5",
        worstRating: "1",
        ratingCount: road.totalRatings,
      },
    }),
    ...(road.imageUrl && { image: road.imageUrl }),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.href}`,
    })),
  };
}
