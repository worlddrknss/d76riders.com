import type { ShopCategory, SponsorTier } from "@prisma/client";

/**
 * One business, two views.
 *
 * A sponsor is a shop that also backs the community, not a different kind of
 * thing, so both live in the Sponsor table and `tier` decides which page shows
 * it: null means listed in the directory only, which is what most businesses
 * are. Keeping them in one row means a shop that later sponsors a ride does not
 * get entered twice and drift.
 */

// Ordered as a rider would scan them: the things that stop a ride first.
export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  MECHANIC: "Service & repair",
  TIRES: "Tires",
  PARTS: "Parts",
  GEAR: "Gear & apparel",
  DEALER: "Dealer",
  DETAILING: "Detailing",
  FABRICATION: "Fabrication & custom",
  TRAINING: "Training",
  OTHER: "Other",
};

export const SHOP_CATEGORIES = Object.keys(SHOP_CATEGORY_LABEL) as ShopCategory[];

export const TIER_LABEL: Record<SponsorTier, string> = {
  PARTNER: "Partner",
  SUPPORTER: "Supporter",
  FRIEND: "Friend of the Community",
};

/** Narrows an arbitrary query string to a real category, or nothing. */
export function parseShopCategory(value: string | undefined): ShopCategory | null {
  if (!value) return null;
  const upper = value.toUpperCase() as ShopCategory;
  return SHOP_CATEGORIES.includes(upper) ? upper : null;
}

/** Digits only, so tel: works regardless of how the number was typed. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
