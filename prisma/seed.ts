import { PrismaClient, type BikeType, type RideDifficulty } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  communityFeed,
  featuredRoads,
  galleryItems,
  garageBikes,
  members,
  pastEvents,
  upcomingEvents,
} from "../src/data/community";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDifficulty(value: string): RideDifficulty {
  switch (value) {
    case "Beginner Friendly":
      return "BEGINNER_FRIENDLY";
    case "Scenic":
      return "SCENIC";
    default:
      return "INTERMEDIATE";
  }
}

function toBikeType(value: string): BikeType {
  switch (value.toLowerCase()) {
    case "naked":
      return "NAKED";
    case "cruiser":
      return "CRUISER";
    case "adventure":
      return "ADVENTURE";
    case "sport":
      return "SPORT";
    case "touring":
      return "TOURING";
    case "standard":
      return "STANDARD";
    default:
      return "OTHER";
  }
}

// "62 Miles" / "160 miles" -> 62 / 160
function toMiles(value: string): number | null {
  const match = value.match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, "")) : null;
}

// "4.2/5" -> 4.2
function toScenicRating(value: string): number | null {
  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

async function main() {
  console.log("Seeding District 76 database...");

  // Riders (each backed by a User).
  const ridersByName = new Map<string, string>();

  for (const member of members) {
    const handle = slugify(member.name);
    const user = await prisma.user.upsert({
      where: { email: `${handle}@d76riders.local` },
      update: { name: member.name },
      create: { name: member.name, email: `${handle}@d76riders.local` },
    });

    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId: user.id,
          role: "USER",
        },
      },
      update: {},
      create: {
        userId: user.id,
        role: "USER",
      },
    });

    const rider = await prisma.rider.upsert({
      where: { handle },
      update: {
        name: member.name,
        location: member.location,
        bio: member.bio ?? null,
        yearsRiding: member.yearsRiding,
        favoriteRoad: member.favoriteRoad ?? null,
        ridesCompleted: member.ridesCompleted ?? 0,
      },
      create: {
        userId: user.id,
        handle,
        name: member.name,
        location: member.location,
        bio: member.bio ?? null,
        yearsRiding: member.yearsRiding,
        favoriteRoad: member.favoriteRoad ?? null,
        ridesCompleted: member.ridesCompleted ?? 0,
      },
    });

    ridersByName.set(member.name, rider.id);
  }

  const riderIds = [...ridersByName.values()];

  // Bikes (per-rider garage).
  for (const bike of garageBikes) {
    const riderId = ridersByName.get(bike.owner) ?? riderIds[0];
    await prisma.bike.upsert({
      where: { id: bike.id },
      update: {},
      create: {
        id: bike.id,
        riderId,
        name: bike.name,
        make: bike.make,
        year: Number(bike.year) || null,
        type: toBikeType(bike.type),
        engineType: bike.engineType,
        enginePower: bike.enginePower,
        displacement: bike.displacement,
        boreStroke: bike.boreStroke,
      },
    });
  }

  // Events (hosts round-robined across riders since mock data has no owner).
  const allEvents = [
    ...upcomingEvents.map((event) => ({ event, status: "UPCOMING" as const })),
    ...pastEvents.map((event) => ({ event, status: "COMPLETED" as const })),
  ];

  for (const [index, { event, status }] of allEvents.entries()) {
    const hostId = riderIds[index % riderIds.length];
    await prisma.rideEvent.upsert({
      where: { slug: event.id },
      update: {},
      create: {
        id: event.id,
        hostId,
        title: event.title,
        slug: event.id,
        description: event.details,
        startsAt: new Date(event.date),
        meetLocation: event.location,
        distanceMiles: toMiles(event.distance),
        difficulty: toDifficulty(event.level),
        status,
      },
    });
  }

  // Curated Featured Roads.
  for (const [index, road] of featuredRoads.entries()) {
    const slug = slugify(road.name);
    const riderId = riderIds[index % riderIds.length];
    await prisma.road.upsert({
      where: { slug },
      update: {},
      create: {
        riderId,
        name: road.name,
        slug,
        distanceMiles: toMiles(road.distance),
        difficulty: toDifficulty(road.difficulty),
        scenicRating: toScenicRating(road.scenicRating),
        imageLabel: road.imageLabel,
      },
    });
  }

  // Global gallery items (no owner yet).
  for (const caption of galleryItems) {
    const existing = await prisma.galleryItem.findFirst({ where: { caption } });
    if (!existing) {
      await prisma.galleryItem.create({
        data: { url: `/images/gallery/${slugify(caption)}.jpg`, caption },
      });
    }
  }

  // Activity feed (best-effort mapping of summaries to riders + types).
  for (const item of communityFeed) {
    const firstName = item.summary.split(" ")[0];
    const riderEntry = [...ridersByName.entries()].find(([name]) =>
      name.startsWith(firstName),
    );
    const riderId = riderEntry?.[1] ?? riderIds[0];

    const summary = item.summary.toLowerCase();
    const type = summary.includes("uploaded")
      ? "UPLOADED_PHOTO"
      : summary.includes("joined")
        ? "JOINED"
        : summary.includes("completed")
          ? "COMPLETED_RIDE"
          : summary.includes("attending")
            ? "RSVP"
            : "POSTED_JOURNAL";

    const existing = await prisma.activity.findFirst({
      where: { summary: item.summary },
    });
    if (!existing) {
      await prisma.activity.create({
        data: { riderId, type, summary: item.summary },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
