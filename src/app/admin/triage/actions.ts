"use server";

import { ReportPriority, ReportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { deleteFilesByUrls } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

// Triage is open to MODERATOR as well as ADMINISTRATOR, matching the previous
// /admin/reports queue this replaces.
async function requireModeratorUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id;

  if (!userId) {
    redirect("/admin");
  }

  const staff = await prisma.userRole.findFirst({
    where: { userId, role: { in: ["MODERATOR", "ADMINISTRATOR"] } },
    select: { id: true },
  });

  if (!staff) {
    redirect("/admin");
  }

  return userId;
}

function revalidateTriage() {
  revalidatePath("/admin/triage");
  revalidatePath("/admin/reports");
}

export async function setReportPriorityAction(reportId: string, priority: string): Promise<void> {
  const userId = await requireModeratorUserId();

  if (!Object.values(ReportPriority).includes(priority as ReportPriority)) {
    return;
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, priority: true, subjectType: true },
  });

  if (!report || report.priority === priority) {
    return;
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { priority: priority as ReportPriority },
  });

  await logAudit({
    actorUserId: userId,
    action: "report.priority",
    entityType: "Report",
    entityId: reportId,
    summary: `Re-tiered ${report.subjectType} report ${report.priority} → ${priority}`,
    before: { priority: report.priority },
    after: { priority },
  });

  revalidateTriage();
}

export async function dismissReportAction(reportId: string, note?: string): Promise<void> {
  const userId = await requireModeratorUserId();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, subjectType: true, reason: true },
  });

  if (!report || report.status !== "PENDING") {
    revalidateTriage();
    return;
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "DISMISSED",
      resolvedById: userId,
      resolvedAt: new Date(),
      resolutionNote: note?.trim() || null,
    },
  });

  await logAudit({
    actorUserId: userId,
    action: "report.dismiss",
    entityType: "Report",
    entityId: reportId,
    summary: `Dismissed ${report.reason} report on ${report.subjectType}`,
    before: { status: report.status },
    after: { status: "DISMISSED", resolutionNote: note?.trim() || null },
  });

  revalidateTriage();
}

// Resolve every other pending report pointing at the same subject, so acting on
// one report clears the duplicates instead of leaving them in the queue.
async function resolveSiblingReports(
  fk: string,
  subjectId: string,
  userId: string,
  status: ReportStatus,
) {
  await prisma.report.updateMany({
    where: { [fk]: subjectId, status: "PENDING" },
    data: { status, resolvedById: userId, resolvedAt: new Date() },
  });
}

/**
 * Take down the content a report targets.
 *
 * What "remove" means depends on the type, so each is handled explicitly rather
 * than deleted uniformly:
 *   JOURNAL_ENTRY / COMMENT / GALLERY_ITEM — deleted outright (plus S3 files)
 *   EVENT     — cancelled, not deleted; RSVPs and check-ins are ride history
 *   NEWS_POST — moved back to REJECTED so the author can revise it
 *   RIDER     — not removable here; use "Escalate to incident" instead, since
 *               account action needs a case file and a human decision
 */
export async function removeReportedContentAction(reportId: string): Promise<void> {
  const userId = await requireModeratorUserId();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      journalEntry: { include: { galleryItems: { select: { url: true } } } },
      galleryItem: { select: { id: true, url: true } },
      comment: { select: { id: true } },
      event: { select: { id: true, slug: true, title: true, status: true } },
      newsPost: { select: { id: true, slug: true, title: true, status: true } },
    },
  });

  if (!report || report.status !== "PENDING") {
    revalidateTriage();
    return;
  }

  const urlsToDelete: string[] = [];
  let summary = "";

  switch (report.subjectType) {
    case "JOURNAL_ENTRY": {
      if (!report.journalEntryId || !report.journalEntry) break;
      urlsToDelete.push(...report.journalEntry.galleryItems.map((item) => item.url));
      await resolveSiblingReports("journalEntryId", report.journalEntryId, userId, "REMOVED");
      await prisma.journalEntry.delete({ where: { id: report.journalEntryId } });
      summary = `Removed journal entry "${report.journalEntry.title ?? "untitled"}"`;
      break;
    }

    case "COMMENT": {
      if (!report.commentId || !report.comment) break;
      await resolveSiblingReports("commentId", report.commentId, userId, "REMOVED");
      await prisma.comment.delete({ where: { id: report.commentId } });
      summary = "Removed comment";
      break;
    }

    case "GALLERY_ITEM": {
      if (!report.galleryItemId || !report.galleryItem) break;
      urlsToDelete.push(report.galleryItem.url);
      await resolveSiblingReports("galleryItemId", report.galleryItemId, userId, "REMOVED");
      await prisma.galleryItem.delete({ where: { id: report.galleryItemId } });
      summary = "Removed photo";
      break;
    }

    case "EVENT": {
      if (!report.eventId || !report.event) break;
      await resolveSiblingReports("eventId", report.eventId, userId, "REMOVED");
      await prisma.rideEvent.update({
        where: { id: report.eventId },
        data: { status: "CANCELLED" },
      });
      summary = `Cancelled event "${report.event.title}"`;
      break;
    }

    case "NEWS_POST": {
      if (!report.newsPostId || !report.newsPost) break;
      await resolveSiblingReports("newsPostId", report.newsPostId, userId, "REMOVED");
      await prisma.newsPost.update({
        where: { id: report.newsPostId },
        data: {
          status: "REJECTED",
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          rejectionReason: "Removed following a community report.",
        },
      });
      summary = `Unpublished news post "${report.newsPost.title}"`;
      break;
    }

    // Rider reports have no automatic takedown — escalate instead.
    case "RIDER":
    default:
      revalidateTriage();
      return;
  }

  if (!summary) {
    revalidateTriage();
    return;
  }

  if (urlsToDelete.length > 0) {
    await deleteFilesByUrls(urlsToDelete);
  }

  await logAudit({
    actorUserId: userId,
    action: "report.remove_content",
    entityType: "Report",
    entityId: reportId,
    summary,
    before: { status: "PENDING", subjectType: report.subjectType },
    after: { status: "REMOVED" },
  });

  revalidateTriage();
  revalidatePath("/", "layout");
}

// Turn a report into a tracked case file. Used for rider reports and anything
// else that needs follow-up beyond a takedown.
export async function escalateReportToIncidentAction(
  reportId: string,
  formData: FormData,
): Promise<void> {
  const userId = await requireModeratorUserId();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reason: true,
      details: true,
      subjectType: true,
      subjectRiderId: true,
      eventId: true,
      journalEntry: { select: { authorId: true } },
      comment: { select: { authorId: true } },
    },
  });

  if (!report) {
    revalidateTriage();
    return;
  }

  const title = (formData.get("title")?.toString() ?? "").trim() || `${report.reason} report`;
  const severity = formData.get("severity")?.toString() ?? "NORMAL";

  // Attribute the incident to whoever authored the reported content.
  const riderId =
    report.subjectRiderId ?? report.journalEntry?.authorId ?? report.comment?.authorId ?? null;

  const incident = await prisma.adminIncident.create({
    data: {
      title,
      summary: report.details ?? `Escalated from a ${report.reason} report on ${report.subjectType}.`,
      severity: severity === "CRITICAL" || severity === "HIGH" || severity === "LOW" ? severity : "NORMAL",
      riderId,
      eventId: report.eventId,
      openedByUserId: userId,
    },
    select: { id: true },
  });

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "REVIEWED",
      resolvedById: userId,
      resolvedAt: new Date(),
      resolutionNote: `Escalated to incident ${incident.id}`,
    },
  });

  await logAudit({
    actorUserId: userId,
    action: "report.escalate",
    entityType: "AdminIncident",
    entityId: incident.id,
    summary: `Escalated ${report.subjectType} report to incident "${title}"`,
    after: { incidentId: incident.id, severity, reportId },
  });

  revalidateTriage();
  redirect(`/admin/incidents/${incident.id}`);
}
