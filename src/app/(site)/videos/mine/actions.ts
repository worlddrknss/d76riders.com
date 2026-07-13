"use server";

import { VideoPlatform } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function detectPlatform(url: string): VideoPlatform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YOUTUBE";
  if (url.includes("tiktok.com")) return "TIKTOK";
  return "OTHER";
}

async function requireCurrentRider() {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);
  const rider = await prisma.rider.findUnique({ where: { userId }, select: { id: true } });

  if (!rider) {
    throw new AuthenticationError("No rider profile found.");
  }

  return rider;
}

export async function addVideoAction(formData: FormData): Promise<void> {
  const rider = await requireCurrentRider();

  const urlInput = normalizeText(formData.get("url"));
  const title = normalizeText(formData.get("title"));

  if (!urlInput) return;

  let validatedUrl: string;
  try {
    const url = new URL(urlInput);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    validatedUrl = url.toString();
  } catch {
    return;
  }

  const platform = detectPlatform(validatedUrl);

  await prisma.riderVideo.create({
    data: {
      riderId: rider.id,
      platform,
      url: validatedUrl,
      title: title || null,
    },
  });

  revalidatePath("/videos/mine");
}

export async function deleteVideoAction(videoId: string): Promise<void> {
  const rider = await requireCurrentRider();

  const video = await prisma.riderVideo.findFirst({ where: { id: videoId, riderId: rider.id }, select: { id: true } });
  if (!video) return;

  await prisma.riderVideo.delete({ where: { id: video.id } });
  revalidatePath("/videos/mine");
}
