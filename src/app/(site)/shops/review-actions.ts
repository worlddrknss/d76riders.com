"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ReviewState = { error: string | null; success: boolean };

async function riderForCurrentUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  return prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
}

/**
 * Create or update the current rider's review of a shop. One review per rider
 * per shop (upsert on the unique pair), so ratings stay one-rider-one-vote.
 */
export async function submitSponsorReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const rider = await riderForCurrentUser();
  if (!rider) return { error: "Please log in to leave a review.", success: false };

  const sponsorId = (formData.get("sponsorId")?.toString() ?? "").trim();
  const rating = Number.parseInt(formData.get("rating")?.toString() ?? "", 10);
  const body = (formData.get("body")?.toString() ?? "").trim().slice(0, 2000) || null;

  if (!sponsorId) return { error: "Missing shop.", success: false };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5 stars.", success: false };
  }

  const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { slug: true } });
  if (!sponsor) return { error: "Shop not found.", success: false };

  await prisma.sponsorReview.upsert({
    where: { sponsorId_riderId: { sponsorId, riderId: rider.id } },
    create: { sponsorId, riderId: rider.id, rating, body },
    update: { rating, body },
  });

  revalidatePath(`/shops/${sponsor.slug}`);
  revalidatePath("/shops");
  return { error: null, success: true };
}

/** Remove the current rider's review of a shop. */
export async function deleteSponsorReviewAction(sponsorId: string): Promise<void> {
  const rider = await riderForCurrentUser();
  if (!rider) return;

  await prisma.sponsorReview.deleteMany({ where: { sponsorId, riderId: rider.id } });

  const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { slug: true } });
  if (sponsor) revalidatePath(`/shops/${sponsor.slug}`);
  revalidatePath("/shops");
}

/**
 * Moderation: remove ANY review by id. Restricted to admins and moderators —
 * for taking down spam or abusive reviews.
 */
export async function moderateDeleteReviewAction(reviewId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const canModerate =
    currentUser.roles.includes("ADMINISTRATOR") || currentUser.roles.includes("MODERATOR");
  if (!canModerate) return;

  const review = await prisma.sponsorReview.findUnique({
    where: { id: reviewId },
    select: { sponsor: { select: { slug: true } } },
  });
  if (!review) return;

  await prisma.sponsorReview.delete({ where: { id: reviewId } }).catch(() => {});
  revalidatePath(`/shops/${review.sponsor.slug}`);
  revalidatePath("/shops");
}
