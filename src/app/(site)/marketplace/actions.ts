"use server";

import crypto from "node:crypto";

import { ListingCategory, ListingCondition, ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { canonicalPair } from "@/lib/dm";
import { optimizeImage } from "@/lib/image";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

const MAX_IMAGES = 6;
const CATEGORIES = new Set<string>(Object.values(ListingCategory));
const CONDITIONS = new Set<string>(Object.values(ListingCondition));

export type ListingFormState = { error: string | null };

function text(formData: FormData, key: string): string {
  return (formData.get(key)?.toString() ?? "").trim();
}

// Parse a dollar string ("1,299.99") into whole cents. Null on invalid/negative.
function toCents(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

async function currentRider() {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  return rider;
}

async function uploadListingImages(files: File[], riderId: string, source: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!allowedImageTypes.has(file.type)) {
      throw new Error("Photos must be JPG, PNG, or WebP.");
    }
    const secure = await validateAndScanImageUpload(file, source);
    const optimized = await optimizeImage(secure.buffer);
    const key = `marketplace/${riderId}/${crypto.randomUUID()}.${optimized.ext}`;
    urls.push(await uploadFile(key, optimized.data, optimized.contentType));
  }
  return urls;
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const rider = await currentRider();
  if (!rider) return { error: "You need a rider profile to post a listing." };

  const throttle = await rateLimit(`listing-create:${rider.id}`, { limit: 20, windowSeconds: 3600 });
  if (!throttle.allowed) return { error: "You're posting a lot of listings quickly. Try again shortly." };

  const title = text(formData, "title");
  const description = text(formData, "description");
  const category = text(formData, "category");
  const condition = text(formData, "condition") || "GOOD";
  const location = text(formData, "location");
  const priceCents = toCents(text(formData, "price"));

  if (title.length < 3 || title.length > 120) return { error: "Give your listing a clear title." };
  if (description.length < 10 || description.length > 4000) return { error: "Add a description (at least a sentence)." };
  if (!CATEGORIES.has(category)) return { error: "Pick a category." };
  if (!CONDITIONS.has(condition)) return { error: "Pick a condition." };
  if (priceCents === null) return { error: "Enter a valid price (or 0 for make-offer)." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0 && !isS3Configured()) {
    return { error: "Photo storage isn't configured yet — post without photos for now." };
  }

  let imageUrls: string[];
  try {
    imageUrls = await uploadListingImages(files, rider.id, "marketplace-create");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't process your photos." };
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId: rider.id,
      title,
      description,
      priceCents,
      category: category as ListingCategory,
      condition: condition as ListingCondition,
      location: location || null,
      images: { create: imageUrls.map((url, order) => ({ url, order })) },
    },
    select: { id: true },
  });

  revalidatePath("/marketplace");
  redirect(`/marketplace/${listing.id}`);
}

// Owner-only status change: mark sold, relist, or remove.
export async function setListingStatusAction(listingId: string, status: ListingStatus): Promise<void> {
  const rider = await currentRider();
  if (!rider) return;
  // Scope the update to the owner — nothing changes if it isn't theirs.
  await prisma.listing.updateMany({
    where: { id: listingId, sellerId: rider.id },
    data: { status },
  });
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace");
}

// Buyer contacts a seller about a listing. Unlike a cold DM, this doesn't require
// a mutual follow — the active listing is the seller's invitation to be reached.
// It opens (or reuses) a conversation marked open-contact so follow-up sends pass
// the DM gate, then drops the buyer straight into the thread.
export async function messageSellerAction(listingId: string): Promise<void> {
  const rider = await currentRider();
  if (!rider) redirect("/login");

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { status: true, sellerId: true },
  });
  // Gone, removed, or your own listing — nothing to message.
  if (!listing || listing.status === "REMOVED") redirect("/marketplace");
  if (listing.sellerId === rider.id) redirect(`/marketplace/${listingId}`);

  const [riderAId, riderBId] = canonicalPair(rider.id, listing.sellerId);
  const convo = await prisma.conversation.upsert({
    where: { riderAId_riderBId: { riderAId, riderBId } },
    create: { riderAId, riderBId, openContact: true },
    update: { openContact: true },
    select: { id: true },
  });
  redirect(`/messages/${convo.id}`);
}

export async function deleteListingAction(listingId: string): Promise<void> {
  const rider = await currentRider();
  if (!rider) return;
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, sellerId: rider.id },
    select: { id: true, images: { select: { url: true } } },
  });
  if (!listing) return; // not theirs (or gone) — no-op

  await prisma.listing.delete({ where: { id: listing.id } });
  await deleteFilesByUrls(listing.images.map((i) => i.url)).catch(() => {});
  revalidatePath("/marketplace");
  redirect("/marketplace");
}
