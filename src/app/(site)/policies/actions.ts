"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type AcknowledgeState = { error: string | null; success: string | null };

// Record a member's acceptance of a policy at its current version.
//
// IP and user-agent are stored as evidence of consent — this is the same reason
// EmergencyCardAccess logs them. Acknowledgment is tied to the version that was
// on screen, so a later version bump re-prompts rather than silently inheriting.
export async function acknowledgePolicyAction(slug: string): Promise<AcknowledgeState> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return { error: "Please log in to accept this policy.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!rider) {
    return { error: "No rider profile found.", success: null };
  }

  const policy = await prisma.policy.findUnique({
    where: { slug },
    select: { id: true, version: true, active: true, title: true },
  });

  if (!policy || !policy.active) {
    return { error: "That policy is no longer available.", success: null };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;

  // Re-submitting an already-accepted version is a no-op rather than an error —
  // a double-click shouldn't look like a failure to the member.
  await prisma.policyAcknowledgment.upsert({
    where: {
      policyId_riderId_version: { policyId: policy.id, riderId: rider.id, version: policy.version },
    },
    create: {
      policyId: policy.id,
      riderId: rider.id,
      version: policy.version,
      ip,
      userAgent: headerList.get("user-agent"),
    },
    update: {},
  });

  revalidatePath(`/policies/${slug}`);
  revalidatePath("/policies");

  return { error: null, success: `Thanks — your acceptance of ${policy.title} is on record.` };
}
