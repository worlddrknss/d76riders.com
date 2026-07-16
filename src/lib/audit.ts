import type { Prisma, PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

// Prisma transaction client or the default client — so an audit row can be
// written inside the same $transaction as the action it records.
type Db = PrismaClient | Prisma.TransactionClient;

type AuditInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
};

// Field names that must never be written into a before/after snapshot, even if
// a caller passes a whole record in. Audit rows are long-lived and widely read
// by staff, so secrets must not leak into them.
const REDACTED_KEYS = new Set([
  "passwordHash",
  "password",
  "sessionToken",
  "token",
  "encryptedData",
  "dekCiphertext",
  "refresh_token",
  "access_token",
  "id_token",
]);

// Snapshots are stored as JSON, so Date/BigInt/Buffer must be reduced to
// JSON-safe values first — otherwise Prisma rejects the write at runtime.
function sanitizeSnapshot(value: unknown, depth = 0): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (depth > 6) return "[truncated]";

  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return `[bytes:${value.byteLength}]`;

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeSnapshot(item, depth + 1) ?? null);
  }

  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key)) {
        out[key] = "[redacted]";
        continue;
      }
      const clean = sanitizeSnapshot(raw, depth + 1);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }

  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;

  return String(value);
}

// Best-effort request attribution. Returns nulls outside a request scope
// (e.g. a script or a background job) rather than throwing.
async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;
    return { ip, userAgent: headerList.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

// Record a privileged action in the append-only audit trail.
//
// Auditing must never break the action it describes: a failure here is
// swallowed and logged, since losing an audit row is strictly better than
// rolling back a completed moderation decision. The exception is when `db` is a
// transaction client — there the write shares the caller's transaction, so a
// failure will surface through it.
export async function logAudit(input: AuditInput, db: Db = prisma): Promise<void> {
  try {
    const { ip, userAgent } = await requestContext();

    await db.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        before: sanitizeSnapshot(input.before),
        after: sanitizeSnapshot(input.after),
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error(`[audit] failed to record "${input.action}"`, error);
  }
}

// Reduce a record to just the fields that changed, so a snapshot pair carries
// the diff rather than two near-identical blobs.
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { before: Partial<T>; after: Partial<T> } {
  const beforeOut: Partial<T> = {};
  const afterOut: Partial<T> = {};

  for (const key of Object.keys(after) as (keyof T)[]) {
    const prev = before[key];
    const next = after[key];
    const same =
      prev instanceof Date && next instanceof Date
        ? prev.getTime() === next.getTime()
        : prev === next;

    if (!same) {
      beforeOut[key] = prev;
      afterOut[key] = next as T[keyof T];
    }
  }

  return { before: beforeOut, after: afterOut };
}
