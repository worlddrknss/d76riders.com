"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { requireUserId } from "@/lib/authz";
import { HAZARD_META, hazardExpiresAt } from "@/lib/hazards";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { hazardReportSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";

export type HazardFormState = { error: string | null; success: string | null };

/**
 * Flag a hazard on a road. Anyone signed in can report — a hazard warning is
 * only useful if it goes up the moment a rider sees it, and it self-expires, so
 * the cost of a wrong one is low and short-lived.
 */
export async function reportHazardAction(
  _prev: HazardFormState,
  formData: FormData,
): Promise<HazardFormState> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return { error: "No rider profile found.", success: null };

  const throttle = await rateLimit(`hazard:${rider.id}`, { limit: 30, windowSeconds: 3600 });
  if (!throttle.allowed) {
    return { error: "You're reporting hazards very quickly. Take a breather and try again shortly.", success: null };
  }

  const parsed = hazardReportSchema.safeParse({
    roadId: formData.get("roadId")?.toString() || undefined,
    routeId: formData.get("routeId")?.toString() || undefined,
    type: formData.get("type")?.toString() ?? "",
    lat: Number(formData.get("lat")),
    lng: Number(formData.get("lng")),
    description: formData.get("description")?.toString().trim() || undefined,
  });
  if (!parsed.success) {
    return { error: "Pick a hazard type and drop it on the map.", success: null };
  }
  const { roadId, routeId, type, lat, lng, description } = parsed.data;

  // Resolve the target — a featured road, or an event's route. Both write the
  // same HazardReport (roadId and/or routeId), and both notify the curator/host.
  let target:
    | { roadId: string; routeId: string | null; curatorRiderId: string; label: string; revalidate: string; activity: { refId: string; metadata: Record<string, string> } | null }
    | null = null;

  if (roadId) {
    const road = await prisma.road.findUnique({
      where: { id: roadId },
      select: { id: true, slug: true, routeId: true, name: true, riderId: true },
    });
    if (!road) return { error: "That road no longer exists.", success: null };
    target = {
      roadId: road.id,
      routeId: road.routeId,
      curatorRiderId: road.riderId,
      label: road.name,
      revalidate: `/roads/${road.slug}`,
      activity: { refId: road.id, metadata: { roadSlug: road.slug, hazardType: type } },
    };
  } else if (routeId) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { id: true, event: { select: { slug: true, title: true, hostId: true } } },
    });
    if (!route?.event) return { error: "That route no longer exists.", success: null };
    target = {
      roadId: "",
      routeId: route.id,
      curatorRiderId: route.event.hostId,
      label: route.event.title,
      revalidate: `/events/${route.event.slug}`,
      activity: { refId: route.id, metadata: { eventSlug: route.event.slug, hazardType: type } },
    };
  }

  if (!target) return { error: "Nothing to attach this hazard to.", success: null };

  await prisma.hazardReport.create({
    data: {
      riderId: rider.id,
      roadId: target.roadId || null,
      routeId: target.routeId,
      type,
      lat,
      lng,
      description: description ?? null,
      expiresAt: hazardExpiresAt(type),
    },
  });

  // Tell the road curator / event host, unless they are the one reporting it.
  if (target.curatorRiderId !== rider.id && target.activity) {
    await logActivity({
      riderId: target.curatorRiderId,
      type: "HAZARD_REPORTED",
      summary: `${HAZARD_META[type].label} reported on ${target.label}`,
      refId: target.activity.refId,
      metadata: target.activity.metadata,
    });
  }

  revalidatePath(target.revalidate);
  return { error: null, success: `${HAZARD_META[type].label} reported. Thanks for the heads up.` };
}

/**
 * Mark a hazard cleared before its timer runs out. The reporter and the road's
 * curator can both do it — whoever rode past and saw it was gone.
 */
export async function clearHazardAction(hazardId: string): Promise<HazardFormState> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });
  if (!rider) return { error: "No rider profile found.", success: null };

  const hazard = await prisma.hazardReport.findUnique({
    where: { id: hazardId },
    select: {
      id: true,
      riderId: true,
      clearedAt: true,
      road: { select: { slug: true, riderId: true } },
      route: { select: { event: { select: { slug: true, hostId: true } } } },
    },
  });
  if (!hazard) return { error: "That hazard no longer exists.", success: null };
  if (hazard.clearedAt) return { error: null, success: "Already cleared." };

  const isAdmin = currentUser?.roles?.includes("ADMINISTRATOR");
  const canClear =
    hazard.riderId === rider.id ||
    hazard.road?.riderId === rider.id ||
    hazard.route?.event?.hostId === rider.id ||
    isAdmin;
  if (!canClear) return { error: "Only the reporter or the road/event owner can clear this.", success: null };

  await prisma.hazardReport.update({
    where: { id: hazard.id },
    data: { clearedAt: new Date(), clearedByRiderId: rider.id },
  });

  if (hazard.road?.slug) revalidatePath(`/roads/${hazard.road.slug}`);
  if (hazard.route?.event?.slug) revalidatePath(`/events/${hazard.route.event.slug}`);
  return { error: null, success: "Marked cleared." };
}
