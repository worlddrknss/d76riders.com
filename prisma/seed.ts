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

  await seedReputationCatalog();
  await seedCommunityCatalog();

  console.log("Seed complete.");
}

// Quest and crew definitions — like badges, these are reference data the
// onboarding checklist and crew pages read.
async function seedCommunityCatalog() {
  const quests = [
    {
      slug: "complete-profile",
      name: "Complete your profile",
      description: "Add a photo, where you ride out of, and a short bio.",
      icon: "user-round",
      href: "/profile",
      criteria: "COMPLETE_PROFILE" as const,
      sortOrder: 1,
    },
    {
      slug: "add-bike",
      name: "Add your bike",
      description: "Put your machine in the garage.",
      icon: "bike",
      href: "/garage/mine",
      criteria: "ADD_BIKE" as const,
      sortOrder: 2,
    },
    {
      slug: "accept-policies",
      name: "Accept the guidelines",
      description: "Read and accept the community guidelines and safety waiver.",
      icon: "file-check-2",
      href: "/policies",
      criteria: "ACCEPT_POLICIES" as const,
      sortOrder: 3,
    },
    {
      slug: "rsvp-event",
      name: "RSVP to a ride",
      description: "Find a ride that suits you and say you're coming.",
      icon: "calendar-check",
      href: "/events",
      criteria: "RSVP_EVENT" as const,
      sortOrder: 4,
    },
    {
      slug: "emergency-card",
      name: "Set up your emergency card",
      description: "So we can help if the worst happens on a ride.",
      icon: "heart-pulse",
      href: "/profile",
      criteria: "ADD_EMERGENCY_CARD" as const,
      sortOrder: 5,
    },
    {
      slug: "follow-rider",
      name: "Follow a rider",
      description: "Start building your feed.",
      icon: "user-plus",
      href: "/r",
      criteria: "FOLLOW_RIDER" as const,
      sortOrder: 6,
    },
    {
      slug: "attend-event",
      name: "Ride with us",
      description: "Check in to your first group ride.",
      icon: "circle-check",
      href: "/events",
      criteria: "ATTEND_EVENT" as const,
      sortOrder: 7,
    },
  ];

  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { slug: quest.slug },
      create: quest,
      update: quest,
    });
  }

  const crews = [
    {
      slug: "sportbike",
      name: "Sportbike",
      description: "Twisties, track days, and anything with clip-ons.",
      sortOrder: 1,
    },
    {
      slug: "touring",
      name: "Touring",
      description: "Long hauls, saddlebags, and all-day comfort.",
      sortOrder: 2,
    },
    {
      slug: "beginner",
      name: "Beginner",
      description: "New riders welcome. Relaxed pace, no ego, plenty of stops.",
      sortOrder: 3,
    },
    {
      slug: "women-riders",
      name: "Women Riders",
      description: "Women who ride, riding together.",
      sortOrder: 4,
    },
  ];

  for (const crew of crews) {
    await prisma.crew.upsert({
      where: { slug: crew.slug },
      create: crew,
      update: crew,
    });
  }

  console.log(`Seeded ${quests.length} quests and ${crews.length} crews.`);
}

// Badge and skill definitions are reference data the reputation engine reads —
// without them, nothing can ever be awarded. Upserted by slug so re-seeding is
// safe and tweaks to copy/thresholds roll forward.
async function seedReputationCatalog() {
  const badges = [
    {
      slug: "first-group-ride",
      name: "First Group Ride",
      description: "Checked in to your first District 76 group ride.",
      icon: "flag",
      tier: "BRONZE" as const,
      criteria: "EVENTS_ATTENDED" as const,
      threshold: 1,
    },
    {
      slug: "ten-rides",
      name: "Regular",
      description: "Attended 10 group rides.",
      icon: "repeat",
      tier: "SILVER" as const,
      criteria: "EVENTS_ATTENDED" as const,
      threshold: 10,
    },
    {
      slug: "fifty-rides",
      name: "Road Family",
      description: "Attended 50 group rides.",
      icon: "users",
      tier: "GOLD" as const,
      criteria: "EVENTS_ATTENDED" as const,
      threshold: 50,
    },
    {
      slug: "five-hundred-miles",
      name: "500 Miles",
      description: "Covered 500 miles on group rides.",
      icon: "gauge",
      tier: "SILVER" as const,
      criteria: "MILES_RIDDEN" as const,
      threshold: 500,
    },
    {
      slug: "two-thousand-miles",
      name: "2,000 Miles",
      description: "Covered 2,000 miles on group rides.",
      icon: "milestone",
      tier: "GOLD" as const,
      criteria: "MILES_RIDDEN" as const,
      threshold: 2000,
    },
    {
      slug: "ride-leader",
      name: "Ride Leader",
      description: "Organized 5 completed rides.",
      icon: "map",
      tier: "GOLD" as const,
      criteria: "EVENTS_ORGANIZED" as const,
      threshold: 5,
    },
    {
      slug: "mentor",
      name: "Mentor",
      description: "Verified at mentor level on a skill track.",
      icon: "graduation-cap",
      tier: "PLATINUM" as const,
      criteria: "MENTOR" as const,
      threshold: 1,
    },
    {
      slug: "safety-first",
      name: "Safety First",
      description: "Accepted the current safety waiver.",
      icon: "shield-check",
      tier: "BRONZE" as const,
      criteria: "SAFETY_ACKNOWLEDGED" as const,
      threshold: 1,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      create: badge,
      update: badge,
    });
  }

  const skills = [
    {
      slug: "formation-riding",
      name: "Formation Riding",
      description: "Holding a staggered formation, spacing, and lane discipline.",
      icon: "grid-3x3",
      sortOrder: 1,
    },
    {
      slug: "cornering",
      name: "Cornering",
      description: "Entry speed, lines, and body position through corners.",
      icon: "spline",
      sortOrder: 2,
    },
    {
      slug: "hand-signals",
      name: "Hand Signals",
      description: "Group hand signals for hazards, stops, and formation changes.",
      icon: "hand",
      sortOrder: 3,
    },
    {
      slug: "group-braking",
      name: "Group Braking",
      description: "Progressive braking and following distance in a pack.",
      icon: "octagon",
      sortOrder: 4,
    },
  ];

  for (const skill of skills) {
    await prisma.skillTrack.upsert({
      where: { slug: skill.slug },
      create: skill,
      update: skill,
    });
  }

  console.log(`Seeded ${badges.length} badges and ${skills.length} skill tracks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
