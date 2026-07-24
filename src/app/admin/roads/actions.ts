"use server";

import { revalidatePath } from "next/cache";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { deleteFilesByUrls } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

/**
 * Roads and hazards, from the console.
 *
 * Roads are community-maintained — any signed-in rider can correct one — so
 * there is no admin edit here; the road's own page already is the editor. What
 * the console was missing is the other half: seeing every road at once, and
 * removing the ones that are duplicates or nonsense.
 *
 * The public delete action can't be reused: it redirects to /roads, which is
 * the wrong place to land from a console row.
 */
async function requireAdmin(): Promise<string> {
  const currentUser = await getCurrentUser();
  try {
    await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw new Error("Administrator access required.");
    }
    throw error;
  }
  return currentUser!.id;
}

export async function adminDeleteRoadsAction(roadIds: string[]): Promise<void> {
  const actorId = await requireAdmin();
  if (roadIds.length === 0) return;

  const roads = await prisma.road.findMany({
    where: { id: { in: roadIds } },
    select: { id: true, name: true, routeId: true, galleryItems: { select: { url: true } } },
  });
  if (roads.length === 0) return;

  const urls = roads.flatMap((road) => road.galleryItems.map((item) => item.url));
  const routeIds = roads.map((road) => road.routeId).filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.road.deleteMany({ where: { id: { in: roads.map((r) => r.id) } } });
    if (routeIds.length > 0) {
      await tx.route.deleteMany({ where: { id: { in: routeIds } } });
    }
  });

  // After the rows are gone: a storage hiccup must not roll back a completed
  // delete, and deleteFilesByUrls already logs and skips what it can't reach.
  await deleteFilesByUrls(urls);

  await logAudit({
    actorUserId: actorId,
    action: "road.delete",
    entityType: "Road",
    entityId: roads.length === 1 ? roads[0].id : null,
    summary:
      roads.length === 1
        ? `Deleted the road "${roads[0].name}"`
        : `Deleted ${roads.length} roads: ${roads.map((r) => r.name).join(", ")}`,
    before: { names: roads.map((r) => r.name) },
  });

  revalidatePath("/admin/roads");
  revalidatePath("/roads");
}

/**
 * Delete hazard reports outright.
 *
 * Clearing is the normal path and any rider can do it — this is for the report
 * that was abuse or nonsense, which should leave no trace on the road at all.
 */
export async function adminDeleteHazardsAction(hazardIds: string[]): Promise<void> {
  const actorId = await requireAdmin();
  if (hazardIds.length === 0) return;

  const hazards = await prisma.hazardReport.findMany({
    where: { id: { in: hazardIds } },
    select: { id: true, type: true, road: { select: { slug: true, name: true } } },
  });
  if (hazards.length === 0) return;

  await prisma.hazardReport.deleteMany({ where: { id: { in: hazards.map((h) => h.id) } } });

  await logAudit({
    actorUserId: actorId,
    action: "hazard.delete",
    entityType: "HazardReport",
    entityId: hazards.length === 1 ? hazards[0].id : null,
    summary: `Deleted ${hazards.length} hazard report${hazards.length === 1 ? "" : "s"}`,
    before: { types: hazards.map((h) => h.type) },
  });

  for (const slug of new Set(hazards.map((h) => h.road?.slug).filter(Boolean))) {
    revalidatePath(`/roads/${slug}`);
  }
  revalidatePath("/admin/roads");
  revalidatePath("/roads");
}

/** Bulk clear, for when a road crew has been through and the list is stale. */
export async function adminClearHazardsAction(hazardIds: string[]): Promise<void> {
  const actorId = await requireAdmin();
  if (hazardIds.length === 0) return;

  const actorRider = await prisma.rider.findUnique({
    where: { userId: actorId },
    select: { id: true },
  });

  const { count } = await prisma.hazardReport.updateMany({
    where: { id: { in: hazardIds }, clearedAt: null },
    data: { clearedAt: new Date(), clearedByRiderId: actorRider?.id ?? null },
  });

  await logAudit({
    actorUserId: actorId,
    action: "hazard.clear",
    entityType: "HazardReport",
    summary: `Marked ${count} hazard report${count === 1 ? "" : "s"} cleared`,
  });

  revalidatePath("/admin/roads");
  revalidatePath("/roads");
}
