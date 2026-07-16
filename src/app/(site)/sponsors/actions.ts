"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type SponsorSubmitState = { error: string | null; success: string | null };

// A rider can't flood the queue with submissions.
const MAX_PENDING_PER_RIDER = 2;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Rendered as an anchor on a public page, so anything but http(s) is refused
// rather than sanitised into something surprising.
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

/**
 * Put a local business forward as a sponsor.
 *
 * Goes to the moderation queue rather than straight onto the page: this is a
 * public form that results in the community's name appearing next to a
 * business, so a human agrees to it first. Nothing here is rendered publicly
 * until an admin approves it.
 *
 * Tier is deliberately not a field — that's a relationship the community
 * decides, not something an applicant picks for themselves.
 */
export async function submitSponsorAction(
  _previous: SponsorSubmitState,
  formData: FormData,
): Promise<SponsorSubmitState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { error: "Please log in to put a business forward.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });
  if (!rider) {
    return { error: "No rider profile found.", success: null };
  }

  const name = (formData.get("name")?.toString() ?? "").trim();
  const description = (formData.get("description")?.toString() ?? "").trim();
  const websiteInput = (formData.get("websiteUrl")?.toString() ?? "").trim();
  const contactName = (formData.get("contactName")?.toString() ?? "").trim();
  const contactEmail = (formData.get("contactEmail")?.toString() ?? "").trim();

  if (!name || name.length > 120) {
    return { error: "What's the business called? (120 characters or fewer.)", success: null };
  }

  if (!description || description.length > 300) {
    return { error: "Say what they do, in 300 characters or fewer.", success: null };
  }

  const websiteUrl = safeUrl(websiteInput);
  if (websiteInput && !websiteUrl) {
    return { error: "The website needs to be a full http(s) address.", success: null };
  }

  if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return { error: "That contact email doesn't look right.", success: null };
  }

  const pending = await prisma.sponsor.count({
    where: { submittedByRiderId: rider.id, status: "PENDING_REVIEW" },
  });
  if (pending >= MAX_PENDING_PER_RIDER) {
    return {
      error: `You already have ${MAX_PENDING_PER_RIDER} submissions waiting on review. Give us a chance to look at those first.`,
      success: null,
    };
  }

  // Slugs are global and shared with admin-created sponsors, so make room for a
  // clash instead of failing the submission.
  const base = slugify(name) || "sponsor";
  let slug = base;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const clash = await prisma.sponsor.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${base}-${attempt}`;
  }

  await prisma.sponsor.create({
    data: {
      slug,
      name,
      description,
      websiteUrl,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      submittedByRiderId: rider.id,
      status: "PENDING_REVIEW",
      // The community decides the tier at review time.
      tier: "SUPPORTER",
    },
  });

  revalidatePath("/admin/community/sponsors");

  return {
    error: null,
    success: "Thanks — that's with the team. We'll take a look before it goes up.",
  };
}
