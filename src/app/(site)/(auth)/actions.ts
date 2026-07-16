"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
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

  const passwordHash = await hashPassword(password);
  const displayName = displayNameInput || username;

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

    await createUserSession(user.id);
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
