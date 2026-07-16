import type { ActivityType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ActivityInput = {
  riderId: string;
  type: ActivityType;
  summary: string;
  refId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

// Prisma transaction client or the default client — so activity rows can be
// written inside an existing $transaction or standalone.
type Db = PrismaClient | Prisma.TransactionClient;

// Write a single activity/notification row addressed to a rider's feed.
// Activities double as the in-app notification stream (see /notifications).
export async function logActivity(input: ActivityInput, db: Db = prisma) {
  await db.activity.create({
    data: {
      riderId: input.riderId,
      type: input.type,
      summary: input.summary,
      refId: input.refId ?? null,
      metadata: input.metadata,
    },
  });
}

// Fan a single notification out to many rider feeds (e.g. all event organizers).
export async function logActivityForRiders(
  riderIds: string[],
  input: Omit<ActivityInput, "riderId">,
  db: Db = prisma,
) {
  const unique = [...new Set(riderIds)];
  if (unique.length === 0) return;
  await db.activity.createMany({
    data: unique.map((riderId) => ({
      riderId,
      type: input.type,
      summary: input.summary,
      refId: input.refId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    })),
  });
}
