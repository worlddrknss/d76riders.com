"use server";

import { NewsPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { AuthenticationError, AuthorizationError, requireUserAnyRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireModeratorUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  try {
    return await requireUserAnyRole(currentUser?.id, ["ADMINISTRATOR", "MODERATOR"]);
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/admin");
    }
    redirect("/admin");
  }
}

export async function approveNewsPostAction(postId: string): Promise<void> {
  const userId = await requireModeratorUserId();

  const existing = await prisma.newsPost.findUnique({
    where: { id: postId },
    select: { title: true, status: true },
  });

  const post = await prisma.newsPost.update({
    where: { id: postId },
    data: {
      status: NewsPostStatus.PUBLISHED,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: null,
      publishedAt: new Date(),
    },
    select: { title: true },
  });

  // Logged before the redirect — redirect() throws, so anything after it is unreachable.
  await logAudit({
    actorUserId: userId,
    action: "news.approve",
    entityType: "NewsPost",
    entityId: postId,
    summary: `Published news post "${post.title}"`,
    before: { status: existing?.status },
    after: { status: NewsPostStatus.PUBLISHED },
  });

  redirect("/admin/news/moderation");
}

export type RejectFormState = { error: string | null };

export async function rejectNewsPostAction(
  postId: string,
  _prev: RejectFormState,
  formData: FormData,
): Promise<RejectFormState> {
  const userId = await requireModeratorUserId();

  const reason = (formData.get("reason")?.toString() ?? "").trim();
  if (!reason) return { error: "A rejection reason is required." };

  const existing = await prisma.newsPost.findUnique({
    where: { id: postId },
    select: { title: true, status: true },
  });

  const post = await prisma.newsPost.update({
    where: { id: postId },
    data: {
      status: NewsPostStatus.REJECTED,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
    select: { title: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "news.reject",
    entityType: "NewsPost",
    entityId: postId,
    summary: `Rejected news post "${post.title}"`,
    before: { status: existing?.status },
    after: { status: NewsPostStatus.REJECTED, rejectionReason: reason },
  });

  redirect("/admin/news/moderation");
}
