"use server";

import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import { allowedImageTypes, validateAndScanImageUpload } from "@/lib/image-upload-security";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearUserSession, getCurrentUser } from "@/lib/session";
import { deleteFileByUrl, deleteFilesByUrls, isS3Configured, uploadFile } from "@/lib/s3";

export type AccountFormState = {
  error: string | null;
  success: string | null;
};

export type DeleteAccountFormState = {
  error: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function normalizeUsername(value: FormDataEntryValue | null): string {
  return normalizeText(value).toLowerCase();
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])?$/.test(username);
}

function isValidAvatarUrl(value: string): boolean {
  if (!value) {
    return true;
  }

  // Allow relative paths (e.g. /api/media/...)
  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateAccountProfileAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;

  try {
    userId = requireUserId(currentUser?.id);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in again.", success: null };
    }

    return { error: "Unable to verify your account.", success: null };
  }

  const displayName = normalizeText(formData.get("displayName"));
  const username = normalizeUsername(formData.get("username"));
  const avatarUrl = normalizeText(formData.get("avatarUrl"));
  const avatarFile = formData.get("avatarFile");
  const coverFile = formData.get("coverFile");
  const bio = normalizeText(formData.get("bio")).slice(0, 1000);
  const location = normalizeText(formData.get("location")).slice(0, 120);
  const favoriteRoad = normalizeText(formData.get("favoriteRoad")).slice(0, 120);
  const yearStartedRidingInput = normalizeText(formData.get("yearStartedRiding"));
  const newPassword = normalizeText(formData.get("newPassword"));
  const youtubeUrl = normalizeText(formData.get("youtubeUrl"));
  const tiktokUrl = normalizeText(formData.get("tiktokUrl"));
  const instagramUrl = normalizeText(formData.get("instagramUrl"));
  const twitterUrl = normalizeText(formData.get("twitterUrl"));

  // Build full URLs from handles/usernames
  function toSocialUrl(input: string, baseUrl: string): string | null {
    if (!input) return null;
    if (input.startsWith("http://") || input.startsWith("https://")) return input;
    const handle = input.replace(/^@/, "");
    return `${baseUrl}${handle}`;
  }

  const resolvedYoutubeUrl = toSocialUrl(youtubeUrl, "https://youtube.com/@");
  const resolvedTiktokUrl = toSocialUrl(tiktokUrl, "https://tiktok.com/@");
  const resolvedInstagramUrl = toSocialUrl(instagramUrl, "https://instagram.com/");
  const resolvedTwitterUrl = toSocialUrl(twitterUrl, "https://x.com/");

  if (!username || !isValidUsername(username)) {
    return {
      error:
        "Username must be 3-24 characters and use only lowercase letters, numbers, dots, underscores, or hyphens.",
      success: null,
    };
  }

  if (!isValidAvatarUrl(avatarUrl)) {
    return { error: "Avatar URL must be a valid http/https URL.", success: null };
  }

  if (newPassword && newPassword.length < 8) {
    return { error: "New password must be at least 8 characters.", success: null };
  }

  const currentYear = new Date().getFullYear();
  let yearsRiding: number | null = null;
  if (yearStartedRidingInput) {
    const yearStartedRiding = Number.parseInt(yearStartedRidingInput, 10);
    if (!Number.isFinite(yearStartedRiding) || yearStartedRiding < 1900 || yearStartedRiding > currentYear) {
      return { error: `Year started riding must be between 1900 and ${currentYear}.`, success: null };
    }
    yearsRiding = Math.max(0, currentYear - yearStartedRiding);
  }

  const resolvedDisplayName = displayName || username;
  const passwordHash = newPassword ? await hashPassword(newPassword) : null;

  const existingProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      image: true,
      rider: {
        select: {
          avatarUrl: true,
          coverUrl: true,
        },
      },
    },
  });

  let nextAvatarUrl = avatarUrl || null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!allowedImageTypes.has(avatarFile.type)) {
      return { error: "Avatar image must be a JPG, PNG, or WebP image.", success: null };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for avatar uploads yet.", success: null };
    }

    let secureUpload: { buffer: Buffer; ext: string; contentType: string };
    try {
      secureUpload = await validateAndScanImageUpload(avatarFile, "account-avatar-update");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate avatar image.", success: null };
    }

    const key = `avatars/${userId}/${crypto.randomUUID()}.${secureUpload.ext}`;
    nextAvatarUrl = await uploadFile(key, secureUpload.buffer, secureUpload.contentType);
  }

  let nextCoverUrl: string | null | undefined = undefined; // undefined = no change

  if (coverFile instanceof File && coverFile.size > 0) {
    if (!allowedImageTypes.has(coverFile.type)) {
      return { error: "Cover image must be a JPG, PNG, or WebP image.", success: null };
    }

    if (!isS3Configured()) {
      return { error: "Storage is not configured for cover uploads yet.", success: null };
    }

    let secureUpload: { buffer: Buffer; ext: string; contentType: string };
    try {
      secureUpload = await validateAndScanImageUpload(coverFile, "account-cover-update");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to validate cover image.", success: null };
    }

    const key = `covers/${userId}/${crypto.randomUUID()}.${secureUpload.ext}`;
    nextCoverUrl = await uploadFile(key, secureUpload.buffer, secureUpload.contentType);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: resolvedDisplayName,
          image: nextAvatarUrl,
          passwordHash: passwordHash || undefined,
        },
      });

      await tx.rider.update({
        where: { userId },
        data: {
          handle: username,
          name: resolvedDisplayName,
          avatarUrl: nextAvatarUrl,
          coverUrl: nextCoverUrl !== undefined ? nextCoverUrl : undefined,
          bio: bio || null,
          location: location || null,
          favoriteRoad: favoriteRoad || null,
          yearsRiding,
          youtubeUrl: resolvedYoutubeUrl,
          tiktokUrl: resolvedTiktokUrl,
          instagramUrl: resolvedInstagramUrl,
          twitterUrl: resolvedTwitterUrl,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That username is already taken.", success: null };
    }

    return { error: "Unable to update profile right now.", success: null };
  }

  const previousAvatarUrl = existingProfile?.rider?.avatarUrl ?? existingProfile?.image ?? null;
  if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
    await deleteFileByUrl(previousAvatarUrl);
  }

  const previousCoverUrl = existingProfile?.rider?.coverUrl ?? null;
  if (previousCoverUrl && nextCoverUrl && previousCoverUrl !== nextCoverUrl) {
    await deleteFileByUrl(previousCoverUrl);
  }

  return { error: null, success: "Profile updated." };
}

export async function deleteAccountAction(
  _previousState: DeleteAccountFormState,
  formData: FormData,
): Promise<DeleteAccountFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;

  try {
    userId = requireUserId(currentUser?.id);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Please log in again." };
    }

    return { error: "Unable to verify your account." };
  }

  const confirmation = normalizeText(formData.get("confirmation"));
  if (confirmation !== "DELETE") {
    return { error: 'Type DELETE to confirm account removal.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      image: true,
      newsPosts: {
        select: {
          coverImageUrl: true,
        },
      },
      rider: {
        select: {
          avatarUrl: true,
          galleryItems: {
            select: { url: true },
          },
          bikes: {
            select: {
              photos: {
                select: { url: true },
              },
            },
          },
          journalEntries: {
            select: {
              galleryItems: {
                select: { url: true },
              },
            },
          },
          events: {
            select: {
              galleryItems: {
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { error: "Account no longer exists." };
  }

  const urls = new Set<string>();
  const pushUrl = (url: string | null | undefined) => {
    if (url) {
      urls.add(url);
    }
  };

  pushUrl(user.image);
  pushUrl(user.rider?.avatarUrl);
  user.newsPosts.forEach((post) => pushUrl(post.coverImageUrl));
  user.rider?.galleryItems.forEach((item) => pushUrl(item.url));
  user.rider?.bikes.forEach((bike) => bike.photos.forEach((photo) => pushUrl(photo.url)));
  user.rider?.journalEntries.forEach((entry) => entry.galleryItems.forEach((item) => pushUrl(item.url)));
  user.rider?.events.forEach((event) => event.galleryItems.forEach((item) => pushUrl(item.url)));

  await clearUserSession();
  await prisma.user.delete({ where: { id: userId } });
  await deleteFilesByUrls([...urls]);

  return { error: null };
}
