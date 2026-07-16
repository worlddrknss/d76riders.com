import type { Policy } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PendingPolicy = Pick<Policy, "id" | "slug" | "title" | "summary" | "type" | "version">;

// Active, required policies this rider has not accepted at the current version.
//
// Acknowledgments are stored per (policy, rider, version), so bumping a
// policy's version makes previous acknowledgments stop matching and the policy
// reappears here — which is exactly how a re-consent is triggered.
export async function pendingPoliciesForRider(riderId: string): Promise<PendingPolicy[]> {
  const policies = await prisma.policy.findMany({
    where: { active: true, required: true },
    orderBy: { publishedAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      type: true,
      version: true,
      acknowledgments: {
        where: { riderId },
        select: { version: true },
      },
    },
  });

  return policies
    .filter((policy) => !policy.acknowledgments.some((ack) => ack.version === policy.version))
    .map((policy) => ({
      id: policy.id,
      slug: policy.slug,
      title: policy.title,
      summary: policy.summary,
      type: policy.type,
      version: policy.version,
    }));
}

export async function hasAcknowledgedPolicy(riderId: string, slug: string): Promise<boolean> {
  const policy = await prisma.policy.findUnique({
    where: { slug },
    select: { id: true, version: true },
  });

  if (!policy) return false;

  const ack = await prisma.policyAcknowledgment.findUnique({
    where: {
      policyId_riderId_version: { policyId: policy.id, riderId, version: policy.version },
    },
    select: { id: true },
  });

  return Boolean(ack);
}
