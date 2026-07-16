import type { Prisma, ReportReason, ReportSubjectType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { defaultPriorityForReason } from "@/lib/triage";

export type SubmitReportInput = {
  reporterRiderId: string;
  subjectType: ReportSubjectType;
  subjectId: string;
  reason: ReportReason;
  details?: string | null;
};

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

// Maps a subject type to the Report FK column that holds it. Report is
// polymorphic (see journal.prisma), so exactly one of these is set per row and
// `subjectType` names which one.
const SUBJECT_FK: Record<ReportSubjectType, keyof Prisma.ReportUncheckedCreateInput> = {
  JOURNAL_ENTRY: "journalEntryId",
  COMMENT: "commentId",
  EVENT: "eventId",
  GALLERY_ITEM: "galleryItemId",
  RIDER: "subjectRiderId",
  NEWS_POST: "newsPostId",
};

// Confirms the reported thing actually exists before a report row points at it.
async function subjectExists(subjectType: ReportSubjectType, subjectId: string): Promise<boolean> {
  const where = { where: { id: subjectId }, select: { id: true } } as const;

  switch (subjectType) {
    case "JOURNAL_ENTRY":
      return Boolean(await prisma.journalEntry.findUnique(where));
    case "COMMENT":
      return Boolean(await prisma.comment.findUnique(where));
    case "EVENT":
      return Boolean(await prisma.rideEvent.findUnique(where));
    case "GALLERY_ITEM":
      return Boolean(await prisma.galleryItem.findUnique(where));
    case "RIDER":
      return Boolean(await prisma.rider.findUnique(where));
    case "NEWS_POST":
      return Boolean(await prisma.newsPost.findUnique(where));
    default:
      return false;
  }
}

// Create a report against any content type. Priority is derived from the reason
// (see defaultPriorityForReason) and can be re-tiered later during triage.
export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const { reporterRiderId, subjectType, subjectId, reason } = input;

  if (!(await subjectExists(subjectType, subjectId))) {
    return { ok: false, error: "That content no longer exists." };
  }

  // Reporting yourself is never actionable, and self-reports would pollute the queue.
  if (subjectType === "RIDER" && subjectId === reporterRiderId) {
    return { ok: false, error: "You can't report your own profile." };
  }

  const fk = SUBJECT_FK[subjectType];

  const existing = await prisma.report.findFirst({
    where: { reporterId: reporterRiderId, [fk]: subjectId, status: "PENDING" },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, error: "You've already reported this. A moderator is reviewing it." };
  }

  await prisma.report.create({
    data: {
      reporterId: reporterRiderId,
      subjectType,
      priority: defaultPriorityForReason(reason),
      reason,
      details: input.details?.trim() || null,
      [fk]: subjectId,
    } as Prisma.ReportUncheckedCreateInput,
  });

  return { ok: true };
}
