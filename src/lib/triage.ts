import type { ReportPriority, ReportReason, ReportSubjectType } from "@prisma/client";

// How long a pending report may sit before it is considered overdue, by tier.
const SLA_HOURS: Record<ReportPriority, number> = {
  URGENT: 4,
  NORMAL: 24,
  LOW: 72,
};

// Default tier for a newly submitted report. Reports that allege harm to a
// person jump the queue; the rest start at NORMAL and can be re-tiered by a
// moderator during triage.
const PRIORITY_BY_REASON: Record<ReportReason, ReportPriority> = {
  HARASSMENT: "URGENT",
  INAPPROPRIATE: "URGENT",
  MISINFORMATION: "NORMAL",
  SPAM: "LOW",
  OTHER: "NORMAL",
};

export function defaultPriorityForReason(reason: ReportReason): ReportPriority {
  return PRIORITY_BY_REASON[reason] ?? "NORMAL";
}

export function slaHoursFor(priority: ReportPriority): number {
  return SLA_HOURS[priority] ?? SLA_HOURS.NORMAL;
}

export function reportSlaDueAt(createdAt: Date, priority: ReportPriority): Date {
  return new Date(createdAt.getTime() + slaHoursFor(priority) * 60 * 60 * 1000);
}

export type SlaState = {
  dueAt: Date;
  overdue: boolean;
  // Whole hours remaining until due; negative once overdue.
  hoursRemaining: number;
  label: string;
};

export function slaState(createdAt: Date, priority: ReportPriority, now = new Date()): SlaState {
  const dueAt = reportSlaDueAt(createdAt, priority);
  const msRemaining = dueAt.getTime() - now.getTime();
  const hoursRemaining = Math.trunc(msRemaining / (60 * 60 * 1000));
  const overdue = msRemaining < 0;

  let label: string;
  if (overdue) {
    const overdueHours = Math.abs(hoursRemaining);
    label = overdueHours >= 24 ? `Overdue ${Math.floor(overdueHours / 24)}d` : `Overdue ${overdueHours}h`;
  } else if (hoursRemaining < 1) {
    label = "Due < 1h";
  } else if (hoursRemaining >= 24) {
    label = `Due in ${Math.floor(hoursRemaining / 24)}d`;
  } else {
    label = `Due in ${hoursRemaining}h`;
  }

  return { dueAt, overdue, hoursRemaining, label };
}

export const PRIORITY_LABEL: Record<ReportPriority, string> = {
  URGENT: "Urgent",
  NORMAL: "Normal",
  LOW: "Low",
};

export const SUBJECT_LABEL: Record<ReportSubjectType, string> = {
  JOURNAL_ENTRY: "Journal entry",
  COMMENT: "Comment",
  EVENT: "Event",
  GALLERY_ITEM: "Photo",
  RIDER: "Rider profile",
  NEWS_POST: "News post",
};

// Ordering for the queue: urgent first, then oldest first — so the row closest
// to breaching its SLA surfaces at the top of its tier.
export const PRIORITY_RANK: Record<ReportPriority, number> = {
  URGENT: 0,
  NORMAL: 1,
  LOW: 2,
};
