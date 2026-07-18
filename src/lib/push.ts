import webpush from "web-push";

import { prisma } from "@/lib/prisma";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:d76riders@gmail.com";

function publicKey(): string | undefined {
  return process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/** True when VAPID keys are present — mirrors isS3Configured so callers no-op safely. */
export function isPushConfigured(): boolean {
  return Boolean(publicKey() && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured(): boolean {
  const pub = publicKey();
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
    configured = true;
  }
  return true;
}

/** Current hour (0-23) in the club's home timezone — quiet hours are Central. */
export function centralHour(): number {
  const s = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(s, 10) % 24;
}

/** Whether now falls inside a rider's quiet-hours window (handles midnight wrap). */
export function isQuietNow(start: number | null, end: number | null): boolean {
  if (start == null || end == null || start === end) return false;
  const h = centralHour();
  return start < end ? h >= start && h < end : h >= start || h < end;
}

/** Send a push to every subscription a rider has, pruning dead endpoints. */
export async function sendPushToRider(riderId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { riderId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  }
}

/**
 * Notify a rider by push, honoring their quiet hours. During quiet hours the push
 * is held (the notification still lands in-app, and the digest cron delivers a
 * summary when the window ends). Fire-and-forget — never throws to the caller.
 */
export async function pushNotifyRider(riderId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  try {
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      select: { quietHoursStart: true, quietHoursEnd: true },
    });
    if (rider && isQuietNow(rider.quietHoursStart, rider.quietHoursEnd)) return;
    await sendPushToRider(riderId, payload);
  } catch {
    // Push is best-effort; never block the originating action.
  }
}
