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

// UNREVIEWED DRAFT — seeded `active: false` on purpose. Do not flip it to active
// until someone who practices law in Tennessee has read it.
//
// This is a starting point to react to, not a waiver. It was drafted to have the
// right shape and cover the right ground, but shape is not enforceability: what a
// release can actually disclaim, and the language it must use to do so, is
// state-specific and not something this file can get right by construction.
//
// Inactive is genuinely inert — /policies filters on active, the detail page
// 404s, and acceptPolicy refuses (src/app/(site)/policies/actions.ts). So it
// collects zero acknowledgments and creates zero legal record until activated.
// Activating it is the moment it starts binding real people, which is why that
// step is deliberately a human's.
//
// Once reviewed, edit the wording at /admin/policies and set it active there.
// If the reviewed text differs materially, bump `version` so anyone who somehow
// accepted the draft is re-prompted rather than left on the old wording.
const SAFETY_WAIVER = {
  slug: "safety-waiver",
  title: "Safety Waiver & Assumption of Risk",
  summary: "Riding is dangerous. What you take on, and what District 76 does not.",
  type: "SAFETY_WAIVER" as const,
  version: "1",
  required: true,
  // See the note above before changing this.
  active: false,
  bodyHtml: [
    "<p>Read this in full before you accept it. It describes risk you are choosing to take on, and it limits what you can later claim against this community and the people in it.</p>",
    "<h2>Motorcycling is inherently dangerous</h2>",
    "<p>Riding a motorcycle on public roads carries a real risk of serious injury, permanent disability, and death — to you, to your passenger, and to others. That risk does not go away because you ride in a group, because the route is familiar, or because someone experienced is leading. Riding in a group adds its own risks: closer spacing, other riders' mistakes, and pressure to keep up. You accept these risks knowingly and voluntarily.</p>",
    "<h2>You are responsible for yourself and your motorcycle</h2>",
    "<p>Before every ride, you are responsible for holding a valid motorcycle license and current insurance; for your motorcycle being roadworthy, including tires and brakes; for your own protective gear; and for being fit to ride — rested, sober, and free of anything that impairs you. Alcohol and impairing drugs before or during a ride are never acceptable. You are responsible for obeying all traffic laws. Nothing about a group ride overrides that, and no instruction from anyone in the group requires you to break the law or ride beyond your ability.</p>",
    "<h2>Ride your own ride</h2>",
    "<p>You decide your own speed, spacing, and whether to ride at all. If a pace, a road, or the weather is beyond what you are comfortable with, slow down, drop back, or stop. The group waits at the next stop. No one in District 76 has authority to tell you to ride faster or closer than you judge safe, and choosing not to ride costs you nothing here.</p>",
    "<h2>What District 76 is, and is not</h2>",
    "<p>District 76 is an informal community of riders, not a business, tour operator, riding school, or professional organizer. Rides are organized by volunteer members for the community's own enjoyment. A ride lead is a volunteer who knows the route — not a guide, instructor, or safety officer, and not someone who has inspected your bike or assessed your ability. Routes, pace guidance, and road notes shared here are informal opinion offered in good faith, not professional advice, and conditions change. No one is supervising you, and no one is responsible for your safety but you.</p>",
    "<h2>Release of claims</h2>",
    "<p>To the fullest extent permitted by Tennessee law, you release District 76, its members, organizers, ride leads, and volunteers from liability for injury, death, or property damage arising from your participation in a District 76 ride or event, including harm arising in part from their ordinary negligence. This release does not extend to gross negligence, recklessness, or intentional or unlawful acts, and it does not waive any right that cannot be waived by law.</p>",
    "<h2>Medical care and your own coverage</h2>",
    "<p>In an emergency, members may summon medical care for you, and you accept the cost of any care you receive. You are responsible for your own health and motorcycle insurance. District 76 carries no coverage for you.</p>",
    "<h2>What you are agreeing to</h2>",
    "<p>By accepting, you confirm that you have read and understood this waiver, that you are at least 18, that you are accepting it freely, and that you understand you are giving up legal rights. Your acceptance is recorded with the date, your IP address, and your browser. If this waiver is later updated, you will be asked to read and accept the new version.</p>",
  ].join(""),
};

// Policy text is authored, so each is created only when missing — never upserted
// over an admin's edits. Order here is the order they are created in.
const POLICIES = [COMMUNITY_GUIDELINES, SAFETY_WAIVER];

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
    href: "/profile?tab=emergency",
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

// Default sub-communities are city-based — riders find their local scene first.
// (Users can still create interest-based ones.)
const CREWS = [
  {
    slug: "clarksville",
    name: "Clarksville",
    description: "Home base. Where District 76 started — group rides, coffee runs, and new-rider meetups.",
    sortOrder: 1,
  },
  {
    slug: "nashville",
    name: "Nashville",
    description: "Music City miles. City escapes, Natchez Trace runs, and after-work rides.",
    sortOrder: 2,
  },
  {
    slug: "knoxville",
    name: "Knoxville",
    description: "East TN and the doorway to the Smokies. Mountain roads and big-elevation days.",
    sortOrder: 3,
  },
  {
    slug: "chattanooga",
    name: "Chattanooga",
    description: "Scenic City. Gateway to the Dragon, the Cherohala, and the best twisties in the state.",
    sortOrder: 4,
  },
  {
    slug: "memphis",
    name: "Memphis",
    description: "West TN. Delta backroads, river routes, and a scene building out in the west.",
    sortOrder: 5,
  },
];

// The previous interest-based defaults, retired in favour of city sub-communities.
// Deactivated (not deleted) so any events/members attached to them are preserved.
const RETIRED_CREW_SLUGS = ["sportbike", "touring", "beginner", "women-riders"];

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
  // Retire the old interest-based defaults so they drop out of the active listing.
  await prisma.crew.updateMany({
    where: { slug: { in: RETIRED_CREW_SLUGS } },
    data: { active: false },
  });

  // Unlike the definitions above, policy text is meant to be edited by admins —
  // so create each only when missing rather than upserting over their wording.
  // This also means the seed can never reactivate a policy an admin deactivated.
  for (const policy of POLICIES) {
    const existing = await prisma.policy.findUnique({
      where: { slug: policy.slug },
      select: { id: true },
    });

    if (existing) {
      console.log(`Policy "${policy.title}" already present — left untouched.`);
    } else {
      await prisma.policy.create({ data: policy });
      console.log(`Created policy "${policy.title}"${policy.active ? "" : " (inactive)"}.`);
    }
  }

  console.log(
    `Catalog seeded: ${BADGES.length} badges, ${SKILL_TRACKS.length} skill tracks, ` +
      `${QUESTS.length} quests, ${CREWS.length} crews.`,
  );
  console.log(
    "Note: the safety waiver is seeded as an UNREVIEWED DRAFT and is inactive — it is " +
      "invisible on /policies and cannot be accepted until someone activates it at " +
      "/admin/policies. Have a Tennessee lawyer read it first. Until it is active, the " +
      "Safety First badge and its trust credit stay unearnable by design.",
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
