"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { deleteFile, listAllKeys, urlToKey } from "@/lib/s3";

export type OrphanScanResult = {
  totalS3Keys: number;
  referencedKeys: number;
  orphanedKeys: string[];
};

export async function scanOrphanedImagesAction(): Promise<OrphanScanResult> {
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
  let deleted = 0;
  for (const key of keys) {
    await deleteFile(key);
    deleted++;
  }
  revalidatePath("/admin/storage");
  return deleted;
}
