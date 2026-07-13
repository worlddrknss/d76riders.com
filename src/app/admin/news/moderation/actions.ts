"use server";

import { NewsPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

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

  await prisma.newsPost.update({
    where: { id: postId },
    data: {
      status: NewsPostStatus.PUBLISHED,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: null,
      publishedAt: new Date(),
    },
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

  await prisma.newsPost.update({
    where: { id: postId },
    data: {
      status: NewsPostStatus.REJECTED,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });

  redirect("/admin/news/moderation");
}
