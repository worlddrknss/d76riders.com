"use server";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { emergencyAccessSchema } from "@/lib/schemas";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: { "User-Agent": "District76Riders/1.0 (emergency-card)" },
        // Reverse geocoding is best-effort; don't hang the access log on it.
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

// Records an access whenever someone acknowledges and views an emergency card.
export async function logEmergencyAccessAction(
  token: string,
  lat: number | null,
  lng: number | null,
): Promise<void> {
  if (typeof token !== "string" || token.length === 0 || token.length > 200) return;

  const coords = emergencyAccessSchema.safeParse({ lat, lng });
  if (!coords.success) return;
  ({ lat, lng } = coords.data);

  const card = await prisma.emergencyCard.findUnique({
    where: { token },
    select: { id: true, active: true },
  });
  if (!card || !card.active) return;

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");

  const address =
    lat != null && lng != null ? await reverseGeocode(lat, lng) : null;

  await prisma.emergencyCardAccess.create({
    data: {
      cardId: card.id,
      ip,
      userAgent,
      lat,
      lng,
      address,
    },
  });
}
