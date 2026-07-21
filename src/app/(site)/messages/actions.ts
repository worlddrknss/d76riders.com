"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/authz";
import { canDm, getOrCreateConversation, otherParticipant } from "@/lib/dm";
import { validateAndScanImageUpload } from "@/lib/image-upload-security";
import { prisma } from "@/lib/prisma";
import { pushNotifyRider } from "@/lib/push";
import { isS3Configured, uploadFile } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

export type MessageDTO = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  imageUrl: string | null;
};

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

/** Resolve the other participant of a conversation the viewer is part of. */
async function otherInConversation(conversationId: string, meId: string): Promise<string | null> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { riderAId: true, riderBId: true },
  });
  if (!convo) return null;
  return otherParticipant(convo, meId);
}

/** Block the other participant of a thread — ends DMs both ways until unblocked. */
export async function blockRiderAction(conversationId: string): Promise<void> {
  const me = await viewerRider();
  if (!me) return;
  const otherId = await otherInConversation(conversationId, me.id);
  if (!otherId || otherId === me.id) return;
  await prisma.riderBlock.upsert({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: otherId } },
    create: { blockerId: me.id, blockedId: otherId },
    update: {},
  });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function unblockRiderAction(conversationId: string): Promise<void> {
  const me = await viewerRider();
  if (!me) return;
  const otherId = await otherInConversation(conversationId, me.id);
  if (!otherId) return;
  await prisma.riderBlock.deleteMany({ where: { blockerId: me.id, blockedId: otherId } });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

/**
 * Send a message (text and/or a photo). Re-checks the mutual-follow gate, scans
 * and stores any image, and pushes the recipient.
 */
export async function sendMessageAction(
  conversationId: string,
  formData: FormData,
): Promise<MessageDTO | null> {
  const me = await viewerRider();
  if (!me) return null;

  const text = (formData.get("body")?.toString() ?? "").trim();
  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if ((!text && !hasPhoto) || text.length > 4000) return null;

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, riderAId: true, riderBId: true },
  });
  if (!convo) return null;

  const otherId = otherParticipant(convo, me.id);
  if (!otherId || !(await canDm(me.id, otherId))) return null;

  let imageUrl: string | null = null;
  if (hasPhoto) {
    if (!isS3Configured()) return null;
    try {
      const secure = await validateAndScanImageUpload(photo, "dm-photo");
      const key = `dm/${conversationId}/${crypto.randomUUID()}.${secure.ext}`;
      imageUrl = await uploadFile(key, secure.buffer, secure.contentType);
    } catch {
      return null;
    }
  }

  const message = await prisma.directMessage.create({
    data: { conversationId, senderId: me.id, body: text, imageUrl },
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, imageUrl: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  await pushNotifyRider(otherId, {
    title: `${me.name} messaged you`,
    body: text ? text.slice(0, 120) : "Sent a photo",
    url: `/messages/${conversationId}`,
    tag: `dm-${conversationId}`,
  });

  revalidatePath("/messages");
  return { ...message, createdAt: message.createdAt.toISOString(), readAt: null };
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
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, imageUrl: true },
  });

  // Mark the other rider's delivered messages as read.
  await prisma.directMessage.updateMany({
    where: { conversationId, senderId: { not: me.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));
}
