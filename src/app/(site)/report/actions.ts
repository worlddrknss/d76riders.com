"use server";

import { ReportReason, ReportSubjectType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { submitReport } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";

export type ReportFormState = {
  error: string | null;
  success: string | null;
};

const VALID_REASONS = new Set<string>(Object.values(ReportReason));
const VALID_SUBJECTS = new Set<string>(Object.values(ReportSubjectType));

// Single entry point for reporting any content type. The subject type and id
// arrive from the client, so both are validated against the enums before use.
export async function reportContentAction(
  subjectType: string,
  subjectId: string,
  reason: string,
  details: string,
): Promise<ReportFormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return { error: "Please log in to report content.", success: null };
  }

  if (!VALID_SUBJECTS.has(subjectType)) {
    return { error: "That content can't be reported.", success: null };
  }

  if (!VALID_REASONS.has(reason)) {
    return { error: "Please select a valid reason.", success: null };
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!rider) {
    return { error: "No rider profile found.", success: null };
  }

  const result = await submitReport({
    reporterRiderId: rider.id,
    subjectType: subjectType as ReportSubjectType,
    subjectId,
    reason: reason as ReportReason,
    details,
  });

  if (!result.ok) {
    return { error: result.error, success: null };
  }

  return { error: null, success: "Report submitted. A moderator will review it." };
}
