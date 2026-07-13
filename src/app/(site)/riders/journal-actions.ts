"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/authz";
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
    revalidatePath(`/riders/${entry.author.handle}`);
  }
}

export async function addJournalCommentAction(entryId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
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

  const entry = await prisma.journalEntry.findUnique({ where: { id: entryId }, select: { author: { select: { handle: true } } } });
  if (entry?.author.handle) {
    revalidatePath(`/riders/${entry.author.handle}`);
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
    revalidatePath(`/riders/${comment.journalEntry.author.handle}`);
  }
}
