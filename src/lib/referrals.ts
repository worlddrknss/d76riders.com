import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

// Ambiguous characters (0/O, 1/I/L) are excluded — invite codes get read aloud
// and typed by hand, so the alphabet avoids the usual transcription mistakes.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

// Fetch a rider's invite code, minting one on first use.
export async function getOrCreateReferralCode(riderId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({
    where: { riderId },
    select: { code: true },
  });

  if (existing) return existing.code;

  // Retry on the astronomically unlikely collision rather than failing the page.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const created = await prisma.referralCode.create({
        data: { riderId, code },
        select: { code: true },
      });
      return created.code;
    } catch {
      // Another request may have created this rider's code concurrently.
      const raced = await prisma.referralCode.findUnique({
        where: { riderId },
        select: { code: true },
      });
      if (raced) return raced.code;
    }
  }

  throw new Error("Could not allocate a referral code");
}

/**
 * Attribute a brand-new signup to an invite code.
 *
 * Deliberately forgiving: an unknown or self-referring code is ignored rather
 * than failing the registration — a bad invite link must never block someone
 * from joining. Returns true only when attribution was recorded.
 */
export async function recordReferral(code: string, referredUserId: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;

  const referralCode = await prisma.referralCode.findUnique({
    where: { code: normalized },
    select: { id: true, rider: { select: { userId: true } } },
  });

  if (!referralCode) return false;

  // Can't refer yourself.
  if (referralCode.rider.userId === referredUserId) return false;

  try {
    await prisma.referral.create({
      data: { codeId: referralCode.id, referredUserId },
    });
    return true;
  } catch {
    // referredUserId is unique — a user already attributed stays with the first
    // referrer rather than being reassigned.
    return false;
  }
}

const CHART_DAYS = 30;

/** Midnight local, `days` ago — the left edge of the chart window. */
function windowStart(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * One point per day for the last 30 days, zero-filled.
 *
 * Zero-filling matters: without it a day with no opens is simply missing, and
 * the line would jump straight from one busy day to the next as though the quiet
 * stretch never happened.
 */
async function dailySeries(codeId: string) {
  const since = windowStart(CHART_DAYS);

  const [clicks, joins] = await Promise.all([
    prisma.referralClick.findMany({
      where: { codeId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.referral.findMany({
      where: { codeId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const opens = new Map<string, number>();
  const joined = new Map<string, number>();
  for (const c of clicks) opens.set(dayKey(c.createdAt), (opens.get(dayKey(c.createdAt)) ?? 0) + 1);
  for (const j of joins) joined.set(dayKey(j.createdAt), (joined.get(dayKey(j.createdAt)) ?? 0) + 1);

  return Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = dayKey(day);
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      opens: opens.get(key) ?? 0,
      joins: joined.get(key) ?? 0,
    };
  });
}

export async function referralStats(riderId: string) {
  const code = await prisma.referralCode.findUnique({
    where: { riderId },
    select: {
      id: true,
      code: true,
      clicks: true,
      referrals: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          referredUser: {
            select: { rider: { select: { handle: true, name: true, avatarUrl: true } } },
          },
        },
      },
    },
  });

  if (!code) {
    return { code: null, clicks: 0, conversions: 0, referrals: [], series: [] };
  }

  return {
    code: code.code,
    clicks: code.clicks,
    conversions: code.referrals.length,
    referrals: code.referrals,
    series: await dailySeries(code.id),
  };
}
