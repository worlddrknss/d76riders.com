import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "d76_session";
const SESSION_TTL_DAYS = 30;

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  handle: string | null;
  avatarUrl: string | null;
  roles: string[];
};

function getSessionExpiresAt() {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

export async function createUserSession(userId: string): Promise<void> {
  const sessionToken = randomBytes(48).toString("hex");
  const expires = getSessionExpiresAt();

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          rider: {
            select: {
              handle: true,
              avatarUrl: true,
              name: true,
            },
          },
          roles: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expires < new Date()) {
    await prisma.session.delete({ where: { sessionToken } });
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.rider?.name ?? session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    image: session.user.image,
    handle: session.user.rider?.handle ?? null,
    avatarUrl: session.user.rider?.avatarUrl ?? null,
    roles: session.user.roles.map((item) => item.role),
  };
}
