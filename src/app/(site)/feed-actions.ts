"use server";

import type { JournalGridEntry } from "@/components/profile/journal-grid";
import { requireUserId } from "@/lib/authz";
import { FEED_PAGE_SIZE, getFeedEntries, type FeedMode } from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Load the next page of the home feed (infinite scroll). */
export async function loadFeedAction(mode: FeedMode, offset: number): Promise<JournalGridEntry[]> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return [];
  }

  const viewer = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!viewer) return [];

  const following = await prisma.riderFollow.findMany({
    where: { followerId: viewer.id },
    select: { followingId: true },
  });
  const knownIds = [...new Set([...following.map((f) => f.followingId), viewer.id])];

  const safeMode: FeedMode =
    mode === "discover" || mode === "mine" || mode === "following" ? mode : "foryou";
  return getFeedEntries({
    viewerId: viewer.id,
    knownIds,
    mode: safeMode,
    skip: Math.max(0, offset),
    take: FEED_PAGE_SIZE,
  });
}
