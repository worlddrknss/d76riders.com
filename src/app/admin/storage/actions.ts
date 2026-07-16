"use server";

import { revalidatePath } from "next/cache";

import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteFile, listAllKeys, urlToKey } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

// Server actions are directly-callable POST endpoints, so authorization must be
// enforced inside the action — the admin layout gate does not protect them.
async function requireAdmin(): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Not authenticated");
  }
  await requireUserRole(currentUser.id, "ADMINISTRATOR");
}

export type OrphanScanResult = {
  totalS3Keys: number;
  referencedKeys: number;
  orphanedKeys: string[];
};

export async function scanOrphanedImagesAction(): Promise<OrphanScanResult> {
  await requireAdmin();

  // 1. List all S3 keys
  const allKeys = await listAllKeys();

  // 2. Collect all image URLs referenced in the database
  const referencedUrls = new Set<string>();

  const [users, riders, galleryItems, newsPosts, gearItems] = await Promise.all([
    prisma.user.findMany({ select: { image: true } }),
    prisma.rider.findMany({ select: { avatarUrl: true, coverUrl: true } }),
    prisma.galleryItem.findMany({ select: { url: true } }),
    prisma.newsPost.findMany({ select: { coverImageUrl: true } }),
    prisma.gearItem.findMany({ select: { imageUrl: true } }),
  ]);

  for (const u of users) { if (u.image) referencedUrls.add(u.image); }
  for (const r of riders) {
    if (r.avatarUrl) referencedUrls.add(r.avatarUrl);
    if (r.coverUrl) referencedUrls.add(r.coverUrl);
  }
  for (const g of galleryItems) { if (g.url) referencedUrls.add(g.url); }
  for (const n of newsPosts) { if (n.coverImageUrl) referencedUrls.add(n.coverImageUrl); }
  for (const g of gearItems) { if (g.imageUrl) referencedUrls.add(g.imageUrl); }

  // 3. Convert URLs to S3 keys
  const referencedKeys = new Set<string>();
  for (const url of referencedUrls) {
    const key = urlToKey(url);
    if (key) referencedKeys.add(key);
  }

  // 4. Find orphans
  const orphanedKeys = allKeys.filter((key) => !referencedKeys.has(key));

  return {
    totalS3Keys: allKeys.length,
    referencedKeys: referencedKeys.size,
    orphanedKeys,
  };
}

export async function deleteOrphanedImagesAction(keys: string[]): Promise<number> {
  await requireAdmin();

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
  revalidatePath("/admin/storage");
  return deleted;
}
