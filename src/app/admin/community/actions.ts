"use server";

import { CrewRole, SponsorTier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
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

  const sponsor = await prisma.sponsor.create({
    data: {
      slug,
      name,
      description: text(formData.get("description")) || null,
      logoUrl: safeUrl(text(formData.get("logoUrl"))),
      websiteUrl,
      tier: Object.values(SponsorTier).includes(tier as SponsorTier) ? (tier as SponsorTier) : "SUPPORTER",
    },
    select: { id: true, name: true, slug: true, tier: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "sponsor.create",
    entityType: "Sponsor",
    entityId: sponsor.id,
    summary: `Added sponsor "${sponsor.name}"`,
    after: sponsor,
  });

  revalidatePath("/admin/community");
  revalidatePath("/sponsors");
  redirect("/admin/community");
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
  revalidatePath("/sponsors");
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
