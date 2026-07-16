"use server";

import { revalidatePath } from "next/cache";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import {
  encryptEmergencyPayload,
  isEmergencyCryptoConfigured,
} from "@/lib/emergency-crypto";
import { prisma } from "@/lib/prisma";
import { emergencyCardSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";

export type EmergencyCardFormState = { error: string | null; success: string | null };

function text(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

async function currentRiderId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  return rider?.id ?? null;
}

export async function saveEmergencyCardAction(
  _previousState: EmergencyCardFormState,
  formData: FormData,
): Promise<EmergencyCardFormState> {
  if (!isEmergencyCryptoConfigured()) {
    return {
      error: "Emergency cards are not configured on this server (missing EMERGENCY_MASTER_KEY).",
      success: null,
    };
  }

  let riderId: string | null;
  try {
    riderId = await currentRiderId();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in again.", success: null };
    }
    return { error: "Unable to verify your account.", success: null };
  }
  if (!riderId) {
    return { error: "Rider profile not found.", success: null };
  }

  // Up to three emergency contacts.
  const contacts: { name: string; relationship: string; phone: string }[] = [];
  for (let i = 0; i < 3; i += 1) {
    const name = text(formData.get(`contactName${i}`));
    const phone = text(formData.get(`contactPhone${i}`));
    const relationship = text(formData.get(`contactRelationship${i}`));
    if (name || phone) {
      contacts.push({ name, phone, relationship });
    }
  }

  const parsed = emergencyCardSchema.safeParse({
    contacts,
    bloodType: text(formData.get("bloodType")),
    allergies: text(formData.get("allergies")),
    conditions: text(formData.get("conditions")),
    medications: text(formData.get("medications")),
    insuranceProvider: text(formData.get("insuranceProvider")),
    insurancePolicy: text(formData.get("insurancePolicy")),
    notes: text(formData.get("notes")),
    showBloodType: checked(formData, "showBloodType"),
    showAllergies: checked(formData, "showAllergies"),
    showConditions: checked(formData, "showConditions"),
    showMedications: checked(formData, "showMedications"),
    showInsurance: checked(formData, "showInsurance"),
    active: checked(formData, "active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: null };
  }

  const {
    showBloodType,
    showAllergies,
    showConditions,
    showMedications,
    showInsurance,
    active,
    ...payload
  } = parsed.data;

  const sealed = encryptEmergencyPayload(payload);
  const visibility = {
    showBloodType,
    showAllergies,
    showConditions,
    showMedications,
    showInsurance,
    active,
  };

  await prisma.emergencyCard.upsert({
    where: { riderId },
    create: {
      riderId,
      encryptedData: sealed.encryptedData,
      dekCiphertext: sealed.dekCiphertext,
      ...visibility,
    },
    update: {
      encryptedData: sealed.encryptedData,
      dekCiphertext: sealed.dekCiphertext,
      ...visibility,
    },
  });

  revalidatePath("/r");
  return { error: null, success: "Emergency card saved." };
}

export async function regenerateEmergencyTokenAction(): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;

  const { randomUUID } = await import("node:crypto");
  await prisma.emergencyCard.update({
    where: { riderId },
    data: { token: randomUUID() },
  });
  revalidatePath("/r");
}

export async function setEmergencyCardActiveAction(active: boolean): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;

  await prisma.emergencyCard.update({
    where: { riderId },
    data: { active },
  });
  revalidatePath("/r");
}

export async function deleteEmergencyCardAction(): Promise<void> {
  const riderId = await currentRiderId();
  if (!riderId) return;

  await prisma.emergencyCard.deleteMany({ where: { riderId } });
  revalidatePath("/r");
}
