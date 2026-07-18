"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { canDm, getOrCreateConversation, otherParticipant } from "@/lib/dm";
import { prisma } from "@/lib/prisma";
import { pushNotifyRider } from "@/lib/push";
import { getCurrentUser } from "@/lib/session";

export type MessageDTO = { id: string; body: string; senderId: string; createdAt: string };

async function viewerRider(): Promise<{ id: string; name: string } | null> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  return prisma.rider.findUnique({ where: { userId }, select: { id: true, name: true } });
}

/** Start (or reopen) a conversation with a rider by handle, then go to it. */
export async function startConversationAction(otherHandle: string): Promise<void> {
  const me = await viewerRider();
  if (!me) redirect("/login");

  const other = await prisma.rider.findUnique({ where: { handle: otherHandle }, select: { id: true } });
  if (!other || !(await canDm(me.id, other.id))) {
    redirect(`/r/${otherHandle}`);
  }

  const conversationId = await getOrCreateConversation(me.id, other.id);
  redirect(`/messages/${conversationId}`);
}

/** Send a message. Re-checks the mutual-follow gate and pushes the recipient. */
export async function sendMessageAction(conversationId: string, body: string): Promise<MessageDTO | null> {
  const me = await viewerRider();
  if (!me) return null;

  const text = body.trim();
  if (!text || text.length > 4000) return null;

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, riderAId: true, riderBId: true },
  });
  if (!convo) return null;

  const otherId = otherParticipant(convo, me.id);
  if (!otherId || !(await canDm(me.id, otherId))) return null;

  const message = await prisma.directMessage.create({
    data: { conversationId, senderId: me.id, body: text },
    select: { id: true, body: true, senderId: true, createdAt: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  await pushNotifyRider(otherId, {
    title: `${me.name} messaged you`,
    body: text.slice(0, 120),
    url: `/messages/${conversationId}`,
    tag: `dm-${conversationId}`,
  });

  revalidatePath("/messages");
  return { ...message, createdAt: message.createdAt.toISOString() };
}

/**
 * Poll for messages after a timestamp (near-real-time). Verifies the viewer is a
 * participant and marks the other rider's messages read as a side effect.
 */
export async function fetchMessagesAction(
  conversationId: string,
  afterIso: string | null,
): Promise<MessageDTO[]> {
  const me = await viewerRider();
  if (!me) return [];

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { riderAId: true, riderBId: true },
  });
  if (!convo || otherParticipant(convo, me.id) === null) return [];

  const after = afterIso ? new Date(afterIso) : null;
  const messages = await prisma.directMessage.findMany({
    where: { conversationId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, body: true, senderId: true, createdAt: true },
  });

  // Mark the other rider's delivered messages as read.
  await prisma.directMessage.updateMany({
    where: { conversationId, senderId: { not: me.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}
