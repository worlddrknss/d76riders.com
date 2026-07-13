"use server";

import { GearCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

const allowedCategories = new Set<string>(Object.values(GearCategory));

async function requireCurrentRider() {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });

  if (!rider) {
    throw new AuthenticationError("No rider profile found for your account yet.");
  }

  return rider;
}

export async function createGearItemAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const categoryInput = normalizeText(formData.get("category"));
  const name = normalizeText(formData.get("name"));
  const brand = normalizeText(formData.get("brand"));
  const model = normalizeText(formData.get("model"));
  const size = normalizeText(formData.get("size"));
  const color = normalizeText(formData.get("color"));
  const condition = normalizeText(formData.get("condition"));
  const purchaseDateInput = normalizeText(formData.get("purchaseDate"));
  const purchaseUrl = normalizeText(formData.get("purchaseUrl"));
  const notes = normalizeText(formData.get("notes"));

  if (!name || !categoryInput || !allowedCategories.has(categoryInput)) {
    return;
  }

  const purchaseDate = purchaseDateInput ? new Date(purchaseDateInput) : null;

  // Validate URL if provided
  let validatedUrl: string | null = null;
  if (purchaseUrl) {
    try {
      const url = new URL(purchaseUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        validatedUrl = url.toString();
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  await prisma.gearItem.create({
    data: {
      riderId: rider.id,
      category: categoryInput as GearCategory,
      name,
      brand: brand || null,
      model: model || null,
      size: size || null,
      color: color || null,
      condition: condition || null,
      purchaseDate: purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null,
      purchaseUrl: validatedUrl,
      notes: notes || null,
    },
  });

  revalidatePath("/gear/mine");
}

export async function updateGearItemAction(itemId: string, formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const item = await prisma.gearItem.findFirst({ where: { id: itemId, riderId: rider.id }, select: { id: true } });
  if (!item) return;

  const name = normalizeText(formData.get("name"));
  const brand = normalizeText(formData.get("brand"));
  const model = normalizeText(formData.get("model"));
  const size = normalizeText(formData.get("size"));
  const color = normalizeText(formData.get("color"));
  const condition = normalizeText(formData.get("condition"));
  const purchaseDateInput = normalizeText(formData.get("purchaseDate"));
  const purchaseUrlInput = normalizeText(formData.get("purchaseUrl"));
  const notes = normalizeText(formData.get("notes"));

  if (!name) return;

  const purchaseDate = purchaseDateInput ? new Date(purchaseDateInput) : null;

  let validatedUrl: string | null = null;
  if (purchaseUrlInput) {
    try {
      const url = new URL(purchaseUrlInput);
      if (url.protocol === "https:" || url.protocol === "http:") {
        validatedUrl = url.toString();
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  await prisma.gearItem.update({
    where: { id: item.id },
    data: {
      name,
      brand: brand || null,
      model: model || null,
      size: size || null,
      color: color || null,
      condition: condition || null,
      purchaseDate: purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null,
      purchaseUrl: validatedUrl,
      notes: notes || null,
    },
  });

  revalidatePath("/gear/mine");
}

export async function deleteGearItemAction(itemId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const item = await prisma.gearItem.findFirst({ where: { id: itemId, riderId: rider.id }, select: { id: true } });
  if (!item) {
    return;
  }

  await prisma.gearItem.delete({ where: { id: item.id } });
  revalidatePath("/gear/mine");
}
