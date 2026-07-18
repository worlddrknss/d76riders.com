"use server";

import { revalidatePath } from "next/cache";

import { absoluteUrl } from "@/lib/absolute-url";
import { logActivity } from "@/lib/activity";
import { requireUserId } from "@/lib/authz";
import { commentEmail } from "@/lib/email-templates";
import { emailNotifyRiders } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function toggleJournalLikeAction(entryId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return;

  const existing = await prisma.like.findUnique({
    where: { riderId_journalEntryId: { riderId: rider.id, journalEntryId: entryId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { riderId: rider.id, journalEntryId: entryId } });
  }

  // Revalidate the profile page where journal entries display
  const entry = await prisma.journalEntry.findUnique({ where: { id: entryId }, select: { author: { select: { handle: true } } } });
  if (entry?.author.handle) {
    revalidatePath(`/r/${entry.author.handle}`);
  }
}

export async function addJournalCommentAction(entryId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true, name: true } });
  if (!rider) return;

  const body = (formData.get("body")?.toString() ?? "").trim();
  if (!body || body.length > 2000) return;

  await prisma.comment.create({
    data: {
      authorId: rider.id,
      journalEntryId: entryId,
      body,
    },
  });

  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: { author: { select: { id: true, handle: true } } },
  });

  // Notify the post's author — in-app + email — unless they're commenting on
  // their own post.
  if (entry && entry.author.id !== rider.id) {
    await logActivity({
      riderId: entry.author.id,
      type: "COMMENTED",
      summary: `${rider.name} commented on your journal post`,
      refId: entryId,
    });
    const url = absoluteUrl(entry.author.handle ? `/r/${entry.author.handle}` : "/");
    await emailNotifyRiders([entry.author.id], "comment", (name) =>
      commentEmail(name, rider.name, url),
    );
  }

  if (entry?.author.handle) {
    revalidatePath(`/r/${entry.author.handle}`);
  }
}

export async function deleteJournalCommentAction(commentId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return;

  const comment = await prisma.comment.findFirst({ where: { id: commentId, authorId: rider.id }, select: { id: true, journalEntry: { select: { author: { select: { handle: true } } } } } });
  if (!comment) return;

  await prisma.comment.delete({ where: { id: comment.id } });

  if (comment.journalEntry?.author.handle) {
    revalidatePath(`/r/${comment.journalEntry.author.handle}`);
  }
}
