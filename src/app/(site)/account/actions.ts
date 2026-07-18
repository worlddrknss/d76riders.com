"use server";

import crypto from "node:crypto";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AuthenticationError, requireUserId } from "@/lib/authz";
import { isValidTimezone } from "@/lib/datetime";
import { sendVerification } from "@/lib/email-verification";
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

/**
 * Save the vertical framing of the rider's cover photo.
 *
 * `position` is the object-position Y percentage (0 = top, 100 = bottom). Only
 * the owner can reframe their own cover, and the value is clamped rather than
 * rejected — it arrives from a drag, so an out-of-range number means the UI
 * over-shot, not that the request is hostile.
 */
export async function updateCoverPositionAction(position: number): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const safe = Number.isFinite(position) ? Math.round(Math.min(100, Math.max(0, position))) : 50;

  const rider = await prisma.rider.findUnique({
    where: { userId },
    select: { handle: true },
  });

  if (!rider) return;

  await prisma.rider.update({
    where: { userId },
    data: { coverPosition: safe },
  });

  revalidatePath(`/r/${rider.handle}`);
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
  const avatarUrlRaw = formData.get("avatarUrl"); // null when the field isn't submitted
  const avatarUrl = normalizeText(avatarUrlRaw);
  const avatarFile = formData.get("avatarFile");
  const coverFile = formData.get("coverFile");
  const bio = normalizeText(formData.get("bio")).slice(0, 1000);
  const location = normalizeText(formData.get("location")).slice(0, 120);
  // Only forms that include a timezone field should touch it — undefined leaves
  // the stored value alone, so saving from a form without the field never wipes
  // a rider's zone.
  const timezone = formData.has("timezone")
    ? isValidTimezone(normalizeText(formData.get("timezone")))
      ? normalizeText(formData.get("timezone"))
      : null
    : undefined;
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

  // Partial avatar update — only change the stored URL when it actually changed.
  //   • new file uploaded        → new S3 URL
  //   • field not submitted      → leave unchanged (undefined)
  //   • field present but empty  → clear the avatar (null)
  //   • unchanged proxied path   → leave unchanged (undefined)
  //   • a genuinely new URL      → validate + use it
  let nextAvatarUrl: string | null | undefined;

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
  } else if (avatarUrlRaw === null) {
    nextAvatarUrl = undefined; // field absent — don't touch it
  } else if (avatarUrl === "") {
    nextAvatarUrl = null; // explicitly cleared
  } else if (avatarUrl.startsWith("/api/media/")) {
    nextAvatarUrl = undefined; // unchanged proxied display path
  } else if (isValidAvatarUrl(avatarUrl)) {
    nextAvatarUrl = avatarUrl; // new external URL
  } else {
    return { error: "Avatar URL must be a valid http/https URL.", success: null };
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
          timezone,
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

/**
 * Mint or rotate the rider's calendar-subscription token. Same action serves
 * "create my link" (first time) and "regenerate" (rotate) — regenerating breaks
 * any calendar already subscribed to the old URL, which is the point.
 */
export async function rotateCalendarTokenAction(): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser();
  const userId = requireUserId(currentUser?.id);

  const token = crypto.randomBytes(24).toString("hex");
  await prisma.rider.update({ where: { userId }, data: { calendarToken: token } });

  revalidatePath("/account");
  return { error: null };
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return normalizeText(value).toLowerCase();
}

/**
 * Request an email change. We don't switch User.email here — a confirmation link
 * is sent to the NEW address, and the change only lands when it's clicked (see
 * consumeVerification). This proves the rider controls the new inbox and keeps
 * the old address usable until then.
 */
export async function requestEmailChangeAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in again.", success: null };
  }

  const email = normalizeEmail(formData.get("email"));
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", success: null };
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, rider: { select: { name: true } } },
  });
  if (!me) return { error: "Account not found.", success: null };

  if (email === me.email.toLowerCase()) {
    return { error: "That's already your email address.", success: null };
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) {
    return { error: "An account with this email already exists.", success: null };
  }

  await sendVerification(userId, email, me.rider?.name ?? me.name ?? "rider", { isChange: true });
  return { error: null, success: `Confirmation sent to ${email}. Click the link to finish the change.` };
}

/**
 * Update the rider's email-notification opt-outs. Checkboxes only POST when
 * checked, so a hidden `prefsSubmitted` marker distinguishes "unchecked" from
 * "form didn't include this field".
 */
export async function updateNotificationPrefsAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const currentUser = await getCurrentUser();
  let userId: string;
  try {
    userId = requireUserId(currentUser?.id);
  } catch {
    return { error: "Please log in again.", success: null };
  }

  await prisma.rider.update({
    where: { userId },
    data: {
      emailOnMention: formData.get("emailOnMention") != null,
      emailOnComment: formData.get("emailOnComment") != null,
      emailOnRsvp: formData.get("emailOnRsvp") != null,
    },
  });

  revalidatePath("/account");
  return { error: null, success: "Notification preferences saved." };
}
