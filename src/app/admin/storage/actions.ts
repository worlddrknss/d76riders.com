"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteFile, listAllObjects, urlToKey } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

// Server actions are directly-callable POST endpoints, so authorization must be
// enforced inside the action — the admin layout gate does not protect them.
async function requireAdmin(): Promise<string> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Not authenticated");
  }
  await requireUserRole(currentUser.id, "ADMINISTRATOR");
  return currentUser.id;
}

/**
 * An object is only treated as an orphan once it has had time to be referenced.
 *
 * The scan races every upload in flight: a file is written to the bucket a
 * moment before the row that points at it exists. Without this window, a scan
 * run at the wrong instant reports someone's photo as garbage and cleanup
 * deletes it out from under them mid-post.
 */
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export type OrphanScanResult = {
  totalS3Keys: number;
  referencedKeys: number;
  orphanedKeys: string[];
  /** Unreferenced but too new to judge — reported, never deleted. */
  tooRecentCount: number;
};

/**
 * Collect every URL the database points at.
 *
 * Getting this list wrong is not a missed-cleanup problem, it is a data-loss
 * one: anything absent here is reported as an orphan, and the delete action
 * will remove it. Marketplace photos, sub-community avatars and sponsor logos
 * were all missing, so every live listing image was being listed as garbage.
 *
 * When adding a model that stores an uploaded file, add it here in the same
 * change.
 */
async function collectReferencedKeys(): Promise<Set<string>> {
  const [
    users,
    riders,
    galleryItems,
    newsPosts,
    gearItems,
    stories,
    dmImages,
    listingImages,
    crews,
    sponsors,
    riderVideos,
    journalVideos,
  ] = await Promise.all([
    prisma.user.findMany({ select: { image: true } }),
    prisma.rider.findMany({ select: { avatarUrl: true, coverUrl: true } }),
    prisma.galleryItem.findMany({ select: { url: true } }),
    prisma.newsPost.findMany({ select: { coverImageUrl: true } }),
    prisma.gearItem.findMany({ select: { imageUrl: true } }),
    prisma.story.findMany({ select: { url: true } }),
    prisma.directMessage.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.listingImage.findMany({ select: { url: true } }),
    prisma.crew.findMany({ select: { avatarUrl: true, coverUrl: true } }),
    prisma.sponsor.findMany({ select: { logoUrl: true } }),
    // Usually external embeds, whose URLs resolve to no key — harmless to
    // include, and it covers any that are self-hosted.
    prisma.riderVideo.findMany({ select: { url: true } }),
    prisma.journalEntry.findMany({ where: { videoUrl: { not: null } }, select: { videoUrl: true } }),
  ]);

  const urls: Array<string | null | undefined> = [
    ...users.map((u) => u.image),
    ...riders.flatMap((r) => [r.avatarUrl, r.coverUrl]),
    ...galleryItems.map((g) => g.url),
    ...newsPosts.map((n) => n.coverImageUrl),
    ...gearItems.map((g) => g.imageUrl),
    ...stories.map((s) => s.url),
    ...dmImages.map((d) => d.imageUrl),
    ...listingImages.map((i) => i.url),
    ...crews.flatMap((c) => [c.avatarUrl, c.coverUrl]),
    ...sponsors.map((s) => s.logoUrl),
    ...riderVideos.map((v) => v.url),
    ...journalVideos.map((j) => j.videoUrl),
  ];

  const keys = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    const key = urlToKey(url);
    if (key) keys.add(key);
  }
  return keys;
}

export async function scanOrphanedImagesAction(): Promise<OrphanScanResult> {
  await requireAdmin();

  const [objects, referencedKeys] = await Promise.all([listAllObjects(), collectReferencedKeys()]);

  const cutoff = Date.now() - MIN_ORPHAN_AGE_MS;
  let tooRecentCount = 0;
  const orphanedKeys: string[] = [];

  for (const object of objects) {
    if (referencedKeys.has(object.key)) continue;
    // No timestamp from the store means we cannot prove it is old enough, so it
    // is held back rather than assumed safe to delete.
    const age = object.lastModified?.getTime();
    if (age === undefined || age > cutoff) {
      tooRecentCount += 1;
      continue;
    }
    orphanedKeys.push(object.key);
  }

  return {
    totalS3Keys: objects.length,
    referencedKeys: referencedKeys.size,
    orphanedKeys,
    tooRecentCount,
  };
}

export async function deleteOrphanedImagesAction(keys: string[]): Promise<number> {
  const actorUserId = await requireAdmin();

  if (!Array.isArray(keys)) return 0;

  // Only delete keys that are genuinely orphaned right now — never trust the
  // client-supplied list blindly, or a caller could delete referenced objects.
  const { orphanedKeys } = await scanOrphanedImagesAction();
  const orphanSet = new Set(orphanedKeys);

  const toDelete = keys.filter(
    (key): key is string => typeof key === "string" && key.length > 0 && orphanSet.has(key),
  );

  let deleted = 0;
  for (const key of toDelete) {
    await deleteFile(key);
    deleted++;
  }

  if (deleted > 0) {
    await logAudit({
      actorUserId,
      action: "storage.delete_orphans",
      entityType: "Storage",
      summary: `Deleted ${deleted} orphaned file${deleted === 1 ? "" : "s"} from object storage`,
      // The key list is the only record of what went — worth keeping verbatim.
      before: { keys: toDelete },
    });
  }

  revalidatePath("/admin/storage");
  return deleted;
}
