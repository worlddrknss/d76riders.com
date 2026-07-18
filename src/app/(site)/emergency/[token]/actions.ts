"use server";

import { headers } from "next/headers";

import { absoluteUrl } from "@/lib/absolute-url";
import { logActivity } from "@/lib/activity";
import { emergencyAccessEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mailer";
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
    select: {
      id: true,
      active: true,
      rider: { select: { id: true, name: true, handle: true, user: { select: { email: true } } } },
    },
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

  // Alert the owner every time — a security signal so they can rotate the link
  // if the access wasn't a real responder. Best-effort; never blocks the log.
  try {
    const whenText = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    await logActivity({
      riderId: card.rider.id,
      type: "EMERGENCY_CARD_VIEWED",
      summary: address
        ? `Your emergency card was viewed near ${address}`
        : "Your emergency card was viewed",
      metadata: { address, ip },
    });
    const to = card.rider.user?.email;
    if (to) {
      const message = emergencyAccessEmail(
        card.rider.name,
        whenText,
        address,
        absoluteUrl(`/r/${card.rider.handle}?tab=emergency`),
      );
      await sendEmail({ to, subject: message.subject, html: message.html });
    }
  } catch (err) {
    console.error("[emergency] failed to alert card owner", err);
  }
}
