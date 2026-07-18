import { prisma } from "@/lib/prisma";

/** Store a conversation's pair in a stable order so the unique constraint holds. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * DMs are gated on a mutual follow — both riders must follow each other. This is
 * checked when starting a conversation AND on every send, so unfollowing ends the
 * ability to message.
 */
export async function canDm(riderId: string, otherId: string): Promise<boolean> {
  if (!riderId || !otherId || riderId === otherId) return false;
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.riderFollow.findUnique({
      where: { followerId_followingId: { followerId: riderId, followingId: otherId } },
      select: { followerId: true },
    }),
    prisma.riderFollow.findUnique({
      where: { followerId_followingId: { followerId: otherId, followingId: riderId } },
      select: { followerId: true },
    }),
  ]);
  return Boolean(aFollowsB && bFollowsA);
}

export async function getOrCreateConversation(riderId: string, otherId: string): Promise<string> {
  const [riderAId, riderBId] = canonicalPair(riderId, otherId);
  const convo = await prisma.conversation.upsert({
    where: { riderAId_riderBId: { riderAId, riderBId } },
    create: { riderAId, riderBId },
    update: {},
    select: { id: true },
  });
  return convo.id;
}

/** Returns the other participant's id, or null if the viewer isn't in the convo. */
export function otherParticipant(
  convo: { riderAId: string; riderBId: string },
  viewerId: string,
): string | null {
  if (convo.riderAId === viewerId) return convo.riderBId;
  if (convo.riderBId === viewerId) return convo.riderAId;
  return null;
}
