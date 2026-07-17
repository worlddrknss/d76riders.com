"use server";

import { ChallengeMetric, CrewRole, SponsorTier, ShopCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffFields, logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireAdminUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    redirect("/admin");
  }
  try {
    await requireUserRole(currentUser.id, "ADMINISTRATOR");
  } catch {
    redirect("/admin");
  }
  return currentUser.id;
}

function text(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Only http(s) links are stored — a sponsor URL is rendered as an anchor, so a
// javascript: or data: value would be an injection vector.
function safeUrl(value: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// ---------- Crews ----------

export async function createCrewAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const name = text(formData.get("name"));
  const slug = slugify(text(formData.get("slug")) || name);

  if (!name || !slug) {
    redirect("/admin/community?error=crew");
  }

  if (await prisma.crew.findUnique({ where: { slug }, select: { id: true } })) {
    redirect("/admin/community?error=crewSlug");
  }

  const crew = await prisma.crew.create({
    data: {
      slug,
      name,
      description: text(formData.get("description")) || name,
      open: formData.get("open") === "on",
    },
    select: { id: true, name: true, slug: true, open: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "crew.create",
    entityType: "Crew",
    entityId: crew.id,
    summary: `Created crew "${crew.name}"`,
    after: crew,
  });

  revalidatePath("/admin/community");
  revalidatePath("/crews");
  redirect("/admin/community");
}

export async function deleteCrewAction(crewId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const crew = await prisma.crew.findUnique({
    where: { id: crewId },
    select: { id: true, name: true, slug: true },
  });
  if (!crew) {
    revalidatePath("/admin/community");
    return;
  }

  await prisma.crew.delete({ where: { id: crewId } });

  await logAudit({
    actorUserId: userId,
    action: "crew.delete",
    entityType: "Crew",
    entityId: crewId,
    summary: `Deleted crew "${crew.name}"`,
    before: crew,
  });

  revalidatePath("/admin/community");
  revalidatePath("/crews");
}

// Promote a rider to crew lead, or add them as a member.
export async function setCrewMemberAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const crewId = text(formData.get("crewId"));
  const handle = text(formData.get("handle"));
  const role = text(formData.get("role"));

  const [crew, rider] = await Promise.all([
    prisma.crew.findUnique({ where: { id: crewId }, select: { id: true, name: true, slug: true } }),
    prisma.rider.findUnique({ where: { handle }, select: { id: true, handle: true } }),
  ]);

  if (!crew || !rider) {
    redirect("/admin/community?error=member");
  }

  const crewRole = Object.values(CrewRole).includes(role as CrewRole) ? (role as CrewRole) : "MEMBER";

  await prisma.crewMember.upsert({
    where: { crewId_riderId: { crewId: crew.id, riderId: rider.id } },
    create: { crewId: crew.id, riderId: rider.id, role: crewRole },
    update: { role: crewRole },
  });

  await logAudit({
    actorUserId: userId,
    action: "crew.member",
    entityType: "Crew",
    entityId: crew.id,
    summary: `Set @${rider.handle} as ${crewRole.toLowerCase()} of "${crew.name}"`,
    after: { riderId: rider.id, role: crewRole },
  });

  revalidatePath("/admin/community");
  revalidatePath(`/crews/${crew.slug}`);
}

// ---------- Sponsors ----------

export async function createSponsorAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const name = text(formData.get("name"));
  const slug = slugify(text(formData.get("slug")) || name);

  if (!name || !slug) {
    redirect("/admin/community?error=sponsor");
  }

  if (await prisma.sponsor.findUnique({ where: { slug }, select: { id: true } })) {
    redirect("/admin/community?error=sponsorSlug");
  }

  const websiteInput = text(formData.get("websiteUrl"));
  const websiteUrl = safeUrl(websiteInput);
  if (websiteInput && !websiteUrl) {
    redirect("/admin/community?error=sponsorUrl");
  }

  const tier = text(formData.get("tier"));
  const category = text(formData.get("category"));

  const sponsor = await prisma.sponsor.create({
    data: {
      slug,
      name,
      description: text(formData.get("description")) || null,
      logoUrl: safeUrl(text(formData.get("logoUrl"))),
      websiteUrl,
      // Empty means listed in the directory without sponsoring anything, which
      // is what most businesses are. Defaulting to SUPPORTER would quietly put
      // every shop on the sponsor wall.
      tier: Object.values(SponsorTier).includes(tier as SponsorTier) ? (tier as SponsorTier) : null,
      category: Object.values(ShopCategory).includes(category as ShopCategory)
        ? (category as ShopCategory)
        : null,
      address: text(formData.get("address")) || null,
      phone: text(formData.get("phone")) || null,
      // Created here, so it's already been through a human — no queue to wait in.
      status: "APPROVED",
      reviewedByUserId: userId,
      reviewedAt: new Date(),
    },
    select: { id: true, name: true, slug: true, tier: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.create",
    entityType: "Sponsor",
    entityId: sponsor.id,
    summary: `Added sponsor "${sponsor.name}" (approved on creation)`,
    after: sponsor,
  });

  revalidatePath("/admin/community/sponsors");
  revalidatePath("/shops");
  redirect("/admin/community/sponsors");
}

export async function deleteSponsorAction(sponsorId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { id: true, name: true, slug: true },
  });
  if (!sponsor) {
    revalidatePath("/admin/community");
    return;
  }

  await prisma.sponsor.delete({ where: { id: sponsorId } });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.delete",
    entityType: "Sponsor",
    entityId: sponsorId,
    summary: `Removed sponsor "${sponsor.name}"`,
    before: sponsor,
  });

  revalidatePath("/admin/community");
  revalidatePath("/shops");
}

/**
 * Edit a listing.
 *
 * Crews and challenges have had this since they shipped; sponsors never did, so
 * a typo in a business name meant deleting the row and retyping it, and a shop
 * that started sponsoring could not be promoted at all.
 *
 * Blank tier is meaningful rather than missing: it means listed in the directory
 * without sponsoring, so it has to be settable back to null, which is why the
 * form sends "NONE" rather than an empty string that could be mistaken for
 * "field absent".
 */
export async function updateSponsorAction(sponsorId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const existing = await prisma.sponsor.findUnique({ where: { id: sponsorId } });
  if (!existing) {
    redirect("/admin/community/sponsors");
  }

  const tier = text(formData.get("tier"));
  const category = text(formData.get("category"));
  const latRaw = text(formData.get("lat"));
  const lngRaw = text(formData.get("lng"));
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  // A half-captured point would drop a pin in the ocean, so coordinates only
  // count as a pair.
  const hasPoint = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const next = {
    name: text(formData.get("name")) || existing.name,
    description: text(formData.get("description")) || null,
    websiteUrl: safeUrl(text(formData.get("websiteUrl"))),
    logoUrl: safeUrl(text(formData.get("logoUrl"))),
    address: text(formData.get("address")) || null,
    phone: text(formData.get("phone")) || null,
    lat: hasPoint ? lat : null,
    lng: hasPoint ? lng : null,
    category: Object.values(ShopCategory).includes(category as ShopCategory)
      ? (category as ShopCategory)
      : null,
    tier: Object.values(SponsorTier).includes(tier as SponsorTier) ? (tier as SponsorTier) : null,
    active: formData.get("active") === "on",
  };

  const { before, after } = diffFields(existing, next);

  await prisma.sponsor.update({ where: { id: sponsorId }, data: next });

  if (Object.keys(after).length > 0) {
    await logAudit({
      actorUserId: userId,
      action: "sponsor.update",
      entityType: "Sponsor",
      entityId: sponsorId,
      summary:
        before.tier !== undefined
          ? next.tier
            ? `Made "${next.name}" a sponsor (${next.tier})`
            : `Removed sponsor tier from "${next.name}" — still listed`
          : `Updated "${next.name}"`,
      before,
      after,
    });
  }

  revalidatePath("/admin/community/sponsors");
  revalidatePath("/shops");
  redirect("/admin/community/sponsors");
}

// Attach or detach a sponsor from a specific ride.
export async function linkSponsorToEventAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const sponsorId = text(formData.get("sponsorId"));
  const eventSlug = text(formData.get("eventSlug"));

  const [sponsor, event] = await Promise.all([
    prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { id: true, name: true } }),
    prisma.rideEvent.findUnique({ where: { slug: eventSlug }, select: { id: true, title: true, slug: true } }),
  ]);

  if (!sponsor || !event) {
    redirect("/admin/community?error=link");
  }

  await prisma.eventSponsor.upsert({
    where: { eventId_sponsorId: { eventId: event.id, sponsorId: sponsor.id } },
    create: { eventId: event.id, sponsorId: sponsor.id },
    update: {},
  });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.link_event",
    entityType: "EventSponsor",
    entityId: event.id,
    summary: `Linked "${sponsor.name}" to ride "${event.title}"`,
    after: { sponsorId: sponsor.id, eventId: event.id },
  });

  revalidatePath("/admin/community");
  revalidatePath(`/events/${event.slug}`);
}

// ---------- Sponsor review ----------

/**
 * Approve a submitted business, and set the tier at the same time.
 *
 * Tier is decided here rather than on the public form: it describes the
 * community's relationship with a business, which isn't an applicant's to
 * choose.
 */
export async function approveSponsorAction(sponsorId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { id: true, name: true, status: true },
  });
  if (!sponsor) {
    revalidatePath("/admin/community/sponsors");
    return;
  }

  const tier = text(formData.get("tier"));

  await prisma.sponsor.update({
    where: { id: sponsorId },
    data: {
      status: "APPROVED",
      tier: Object.values(SponsorTier).includes(tier as SponsorTier)
        ? (tier as SponsorTier)
        : "SUPPORTER",
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.approve",
    entityType: "Sponsor",
    entityId: sponsorId,
    summary: `Approved "${sponsor.name}" as a sponsor`,
    before: { status: sponsor.status },
    after: { status: "APPROVED", tier },
  });

  revalidatePath("/admin/community/sponsors");
  revalidatePath("/shops");
  revalidatePath("/");
}

export async function rejectSponsorAction(sponsorId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { id: true, name: true, status: true },
  });
  if (!sponsor) {
    revalidatePath("/admin/community/sponsors");
    return;
  }

  const reason = text(formData.get("reason"));

  await prisma.sponsor.update({
    where: { id: sponsorId },
    data: {
      status: "REJECTED",
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: reason || null,
    },
  });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.reject",
    entityType: "Sponsor",
    entityId: sponsorId,
    summary: `Rejected "${sponsor.name}" as a sponsor`,
    before: { status: sponsor.status },
    after: { status: "REJECTED", rejectionReason: reason || null },
  });

  revalidatePath("/admin/community/sponsors");
}

// ---------- Moderation edits ----------
//
// Members create crews and challenges; this console exists to keep what they
// create in line with the community guidelines. Editing matters as much as
// deleting: a crew with an off-colour description should be corrected, not
// obliterated along with its members' history.
//
// `active` is the moderation lever of choice — deactivating hides something
// while leaving members' membership and progress intact. Delete is for the
// cases where the thing shouldn't have existed at all.

export async function updateCrewAction(crewId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const existing = await prisma.crew.findUnique({ where: { id: crewId } });
  if (!existing) {
    redirect("/admin/community");
  }

  const next = {
    name: text(formData.get("name")) || existing.name,
    description: text(formData.get("description")) || existing.description,
    open: formData.get("open") === "on",
    active: formData.get("active") === "on",
  };

  const { before, after } = diffFields(existing, next);

  await prisma.crew.update({ where: { id: crewId }, data: next });

  if (Object.keys(after).length > 0) {
    await logAudit({
      actorUserId: userId,
      action: before.active !== undefined && !next.active ? "crew.deactivate" : "crew.update",
      entityType: "Crew",
      entityId: crewId,
      summary: !next.active
        ? `Deactivated crew "${next.name}" — hidden, members kept`
        : `Updated crew "${next.name}"`,
      before,
      after,
    });
  }

  revalidatePath("/admin/community");
  revalidatePath("/crews");
  revalidatePath(`/crews/${existing.slug}`);
  redirect("/admin/community");
}

export async function updateChallengeAction(challengeId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const existing = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!existing) {
    redirect("/admin/community");
  }

  // Name, description, and active are editable; metric, goal, and window are not.
  // Riders joined under those terms and have progress scored against them —
  // moving the goalposts mid-challenge would rewrite what they signed up for.
  const next = {
    name: text(formData.get("name")) || existing.name,
    description: text(formData.get("description")) || existing.description,
    active: formData.get("active") === "on",
  };

  const { before, after } = diffFields(existing, next);

  await prisma.challenge.update({ where: { id: challengeId }, data: next });

  if (Object.keys(after).length > 0) {
    await logAudit({
      actorUserId: userId,
      action: before.active !== undefined && !next.active ? "challenge.deactivate" : "challenge.update",
      entityType: "Challenge",
      entityId: challengeId,
      summary: !next.active
        ? `Deactivated challenge "${next.name}" — hidden, entries kept`
        : `Updated challenge "${next.name}"`,
      before,
      after,
    });
  }

  revalidatePath("/admin/community");
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${existing.slug}`);
  redirect("/admin/community");
}

// ---------- Challenges ----------

export async function createChallengeAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const name = text(formData.get("name"));
  const slug = slugify(text(formData.get("slug")) || name);
  const goal = Number.parseInt(text(formData.get("goal")), 10);
  const startsAt = new Date(text(formData.get("startsAt")));
  const endsAt = new Date(text(formData.get("endsAt")));
  const metric = text(formData.get("metric"));

  if (!name || !slug || !Number.isFinite(goal) || goal <= 0) {
    redirect("/admin/community?error=challenge");
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    redirect("/admin/community?error=challengeWindow");
  }

  if (await prisma.challenge.findUnique({ where: { slug }, select: { id: true } })) {
    redirect("/admin/community?error=challengeSlug");
  }

  const crewId = text(formData.get("crewId")) || null;
  const badgeId = text(formData.get("badgeId")) || null;

  const challenge = await prisma.challenge.create({
    data: {
      slug,
      name,
      description: text(formData.get("description")) || name,
      metric: Object.values(ChallengeMetric).includes(metric as ChallengeMetric)
        ? (metric as ChallengeMetric)
        : "EVENTS_ATTENDED",
      goal,
      startsAt,
      endsAt,
      crewId,
      badgeId,
    },
    select: { id: true, name: true, slug: true, metric: true, goal: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "challenge.create",
    entityType: "Challenge",
    entityId: challenge.id,
    summary: `Created challenge "${challenge.name}" (${challenge.goal} ${challenge.metric})`,
    after: challenge,
  });

  revalidatePath("/admin/community");
  revalidatePath("/challenges");
  redirect("/admin/community");
}

export async function deleteChallengeAction(challengeId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, name: true, slug: true },
  });
  if (!challenge) {
    revalidatePath("/admin/community");
    return;
  }

  await prisma.challenge.delete({ where: { id: challengeId } });

  await logAudit({
    actorUserId: userId,
    action: "challenge.delete",
    entityType: "Challenge",
    entityId: challengeId,
    summary: `Deleted challenge "${challenge.name}" and every rider's entry in it`,
    before: challenge,
  });

  revalidatePath("/admin/community");
  revalidatePath("/challenges");
}

// ---------- Event highlights ----------

export async function toggleEventFeaturedAction(eventId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const event = await prisma.rideEvent.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true, featured: true },
  });

  if (!event) {
    revalidatePath("/admin/community");
    return;
  }

  await prisma.rideEvent.update({
    where: { id: eventId },
    data: { featured: !event.featured },
  });

  await logAudit({
    actorUserId: userId,
    action: "event.feature",
    entityType: "RideEvent",
    entityId: eventId,
    summary: `${event.featured ? "Unfeatured" : "Featured"} "${event.title}" on the homepage`,
    before: { featured: event.featured },
    after: { featured: !event.featured },
  });

  revalidatePath("/admin/community");
  revalidatePath("/");
  revalidatePath(`/events/${event.slug}`);
}
