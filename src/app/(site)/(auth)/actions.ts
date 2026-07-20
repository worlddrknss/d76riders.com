"use server";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isValidTimezone } from "@/lib/datetime";
import { sendVerification } from "@/lib/email-verification";
import { geocodePlace } from "@/lib/geocode";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { recordReferral } from "@/lib/referrals";
import { clearUserSession, createUserSession } from "@/lib/session";

export type AuthFormState = {
  error: string | null;
};

function normalizeEmail(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function normalizeUsername(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim().toLowerCase();
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])?$/.test(username);
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const displayNameInput = normalizeText(formData.get("name"));
  const username = normalizeUsername(formData.get("username"));
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const location = normalizeText(formData.get("location"));
  const timezone = normalizeText(formData.get("timezone"));

  if (!username) {
    return { error: "Username is required." };
  }

  if (!isValidUsername(username)) {
    return {
      error:
        "Username must be 3-24 characters and use only lowercase letters, numbers, dots, underscores, or hyphens.",
    };
  }

  if (!email) {
    return { error: "Email is required." };
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (location.length < 2 || location.length > 120) {
    return { error: "Enter your location (city and state)." };
  }

  if (!isValidTimezone(timezone)) {
    return { error: "Pick your timezone." };
  }

  const passwordHash = await hashPassword(password);
  const displayName = displayNameInput || username;
  // Best-effort geocode so "near me" works from day one; a miss just leaves
  // coordinates null and the rider still gets their typed location + timezone.
  const geocoded = await geocodePlace(location);

  try {
    const user = await prisma.user.create({
      data: {
        name: displayName,
        email,
        passwordHash,
        rider: {
          create: {
            handle: username,
            name: displayName,
            location,
            timezone,
            latitude: geocoded?.lat ?? null,
            longitude: geocoded?.lng ?? null,
          },
        },
        roles: {
          create: {
            role: "USER",
          },
        },
      },
      select: { id: true },
    });

    // Attribute the signup to an invite, if one brought them here. Never let a
    // referral problem fail a registration that already succeeded.
    const cookieStore = await cookies();
    const referralCode = formData.get("ref")?.toString() || cookieStore.get("d76_ref")?.value;
    if (referralCode) {
      try {
        await recordReferral(referralCode, user.id);
      } catch (referralError) {
        console.error("[referral] failed to attribute signup", referralError);
      }
      cookieStore.delete("d76_ref");
    }

    // Sign in first so a slow/unreachable mail server can never leave the account
    // created-but-not-logged-in (the cause of a stuck "Creating account…").
    await createUserSession(user.id);

    // Welcome + confirmation email. The account is signed in but gated until
    // they click the link (see the (site) layout). sendVerification never throws,
    // and the transport is timeout-bounded, so this can't hang registration.
    await sendVerification(user.id, email, displayName, { welcome: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("email")) {
        return { error: "An account with this email already exists." };
      }

      if (target.includes("handle")) {
        return { error: "That username is already taken." };
      }

      return { error: "Email or username already exists." };
    }

    return { error: "Unable to create account right now. Please try again." };
  }

  redirect("/");
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return { error: "Invalid email or password." };
  }

  await createUserSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearUserSession();
  redirect("/login");
}

export type ResetRequestState = { error: string | null; sent: boolean };

// Always reports the same "if an account exists, we sent a link" outcome so the
// form can't be used to probe which emails have accounts.
export async function requestPasswordResetAction(
  _previousState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", sent: false };
  }
  await requestPasswordReset(email);
  return { error: null, sent: true };
}

export type ResetPasswordState = { error: string | null };

export async function resetPasswordAction(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = normalizeText(formData.get("token"));
  const password = normalizeText(formData.get("password"));

  if (!token) {
    return { error: "This reset link is invalid." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const result = await resetPassword(token, password);
  if (!result.ok) {
    return {
      error:
        result.reason === "expired"
          ? "This reset link has expired. Request a new one."
          : "This reset link is invalid or already used. Request a new one.",
    };
  }

  // Sign in with the new password so the rider lands straight in the app.
  await createUserSession(result.userId);
  redirect("/");
}
