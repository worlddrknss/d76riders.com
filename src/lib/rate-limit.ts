import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Fixed-window rate limit, backed by a single Postgres row per key so the count
 * is shared across app replicas. The whole check is one atomic upsert: on
 * conflict, the window resets when it has elapsed, otherwise the count
 * increments — no read-then-write race.
 *
 * Fails OPEN: if the limiter query itself errors, the request is allowed rather
 * than locking users out of auth because of a transient DB hiccup.
 */
export async function rateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
          THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
          THEN now() ELSE "RateLimit"."windowStart" END
      RETURNING "count";
    `;
    const count = rows[0]?.count ?? 1;
    return { allowed: count <= rule.limit, remaining: Math.max(0, rule.limit - count) };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return { allowed: true, remaining: rule.limit };
  }
}

/** Best-effort client IP from proxy headers (Cilium/Envoy set x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
