"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { deleteFilesByUrls } from "@/lib/s3";

async function requireModeratorUserId(): Promise<string> {
  const currentUser = await getCurrentUser();

  try {
    // Allow both MODERATOR and ADMINISTRATOR
    const userId = currentUser?.id;
    if (!userId) {
      redirect("/admin");
    }

    const hasRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: { in: ["MODERATOR", "ADMINISTRATOR"] },
      },
    });

    if (!hasRole) {
      redirect("/admin");
    }

    return userId;
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/admin");
    }
    throw error;
  }
}

export async function dismissReportAction(reportId: string): Promise<void> {
  const userId = await requireModeratorUserId();

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "DISMISSED",
      resolvedById: userId,
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/admin/reports");
}

export async function removeContentAction(reportId: string): Promise<void> {
  const userId = await requireModeratorUserId();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      journalEntry: {
        include: { galleryItems: true },
      },
    },
  });

  if (!report || !report.journalEntry) {
    revalidatePath("/admin/reports");
    return;
  }

  const urls = report.journalEntry.galleryItems.map((item) => item.url);

  await prisma.$transaction(async (tx) => {
    // Mark all pending reports for this entry as REMOVED
    await tx.report.updateMany({
      where: { journalEntryId: report.journalEntryId, status: "PENDING" },
      data: {
        status: "REMOVED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });

    // Delete the journal entry (cascades gallery items, comments, likes)
    await tx.journalEntry.delete({
      where: { id: report.journalEntryId },
    });
  });

  await deleteFilesByUrls(urls);
  revalidatePath("/admin/reports");
}
