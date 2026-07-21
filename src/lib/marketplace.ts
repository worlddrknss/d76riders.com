import type { ListingCategory, ListingCondition } from "@prisma/client";

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  BIKE: "Bike",
  PARTS: "Parts",
  GEAR: "Gear",
  ACCESSORIES: "Accessories",
  OTHER: "Other",
};

export const CONDITION_LABEL: Record<ListingCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
  FOR_PARTS: "For parts",
};

/** Cents → display price. 0 reads as "Make offer". */
export function formatPrice(priceCents: number): string {
  if (priceCents <= 0) return "Make offer";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}
