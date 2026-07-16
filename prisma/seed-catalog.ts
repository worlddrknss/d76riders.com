// Reference data for the reputation (Phase 10) and community-growth (Phase 11)
// features: badge definitions, skill tracks, onboarding quests, and crews.
//
// This is the ONLY seed that is safe to run against production. It is separate
// from prisma/seed.ts on purpose — that script also creates demo riders, events,
// and roads from src/data/community.ts, which must never touch a live database.
//
// Everything here is upserted by slug, so re-running is safe and edits to copy
// or thresholds roll forward.
//
//   npm run db:seed:catalog
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type Db = Pick<PrismaClient, "badge" | "skillTrack" | "quest" | "crew" | "policy">;

// The community's four standing rules, as already shown on /join (src/data/community.ts),
// turned into the policy members actually accept. Kept in the community's own words
// rather than invented copy — it is editable at /admin/policies, and bumping the
// version there re-prompts everyone.
//
// Only created if absent: once an admin edits the text, re-running the seed must
// not overwrite what they wrote.
const COMMUNITY_GUIDELINES = {
  slug: "community-guidelines",
  title: "Community Guidelines",
  summary: "How we ride together. Expected of every member, on the road and online.",
  type: "COMMUNITY_GUIDELINES" as const,
  version: "1",
  required: true,
  active: true,
  bodyHtml: [
    "<p>District 76 is a local rider community. These are the standards we hold each other to, on the road and online.</p>",
    "<h2>Ride your own ride</h2>",
    "<p>Respect pace groups. Never ride beyond your ability to keep up with someone else — the group waits at the next stop, every time. If a pace does not suit you, move to a group that does.</p>",
    "<h2>Treat every member with respect</h2>",
    "<p>In person and online. Disagree without abuse. Harassment of any kind ends your place in this community.</p>",
    "<h2>Follow event briefings and safety instructions</h2>",
    "<p>Ride leads and sweeps are there to keep the group together and safe. Turn up for the briefing, follow the hand signals, and check in and out so we know who is on the road with us.</p>",
    "<h2>Support local businesses and keep routes clean</h2>",
    "<p>The shops, cafes, and fuel stops on our routes host us. Leave them better than we found them, and leave nothing behind.</p>",
  ].join(""),
};

const BADGES = [
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

const SKILL_TRACKS = [
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

const QUESTS = [
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

const CREWS = [
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

export async function seedCatalog(prisma: Db) {
  for (const badge of BADGES) {
    await prisma.badge.upsert({ where: { slug: badge.slug }, create: badge, update: badge });
  }
  for (const skill of SKILL_TRACKS) {
    await prisma.skillTrack.upsert({ where: { slug: skill.slug }, create: skill, update: skill });
  }
  for (const quest of QUESTS) {
    await prisma.quest.upsert({ where: { slug: quest.slug }, create: quest, update: quest });
  }
  for (const crew of CREWS) {
    await prisma.crew.upsert({ where: { slug: crew.slug }, create: crew, update: crew });
  }

  // Unlike the definitions above, policy text is meant to be edited by admins —
  // so create it only when missing rather than upserting over their wording.
  const existingPolicy = await prisma.policy.findUnique({
    where: { slug: COMMUNITY_GUIDELINES.slug },
    select: { id: true },
  });

  if (existingPolicy) {
    console.log("Community Guidelines already present — left untouched.");
  } else {
    await prisma.policy.create({ data: COMMUNITY_GUIDELINES });
    console.log("Created the Community Guidelines policy.");
  }

  console.log(
    `Catalog seeded: ${BADGES.length} badges, ${SKILL_TRACKS.length} skill tracks, ` +
      `${QUESTS.length} quests, ${CREWS.length} crews.`,
  );
  console.log(
    "Note: no SAFETY_WAIVER is seeded — write and publish it at /admin/policies. " +
      "Until then the Safety First badge and its trust credit stay unearnable by design.",
  );
}

// Only opens its own connection when run directly, so prisma/seed.ts can import
// seedCatalog and reuse its client.
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    await seedCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// `import.meta.url` matches argv[1] only when this file is the entrypoint.
const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
