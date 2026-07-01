import { type Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function requireUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new AuthenticationError();
  }

  return userId;
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });

  return rows.map((row) => row.role);
}

export async function hasRole(userId: string, role: Role): Promise<boolean> {
  const userRole = await prisma.userRole.findUnique({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    select: { id: true },
  });

  return Boolean(userRole);
}

export async function hasAnyRole(userId: string, roles: readonly Role[]): Promise<boolean> {
  if (roles.length === 0) {
    return false;
  }

  const count = await prisma.userRole.count({
    where: {
      userId,
      role: {
        in: [...roles],
      },
    },
  });

  return count > 0;
}

export async function requireRole(userId: string, role: Role): Promise<void> {
  const allowed = await hasRole(userId, role);

  if (!allowed) {
    throw new AuthorizationError();
  }
}

export async function requireAnyRole(userId: string, roles: readonly Role[]): Promise<void> {
  const allowed = await hasAnyRole(userId, roles);

  if (!allowed) {
    throw new AuthorizationError();
  }
}

export async function requireUserRole(
  userId: string | null | undefined,
  role: Role,
): Promise<string> {
  const verifiedUserId = requireUserId(userId);
  await requireRole(verifiedUserId, role);
  return verifiedUserId;
}

export async function requireUserAnyRole(
  userId: string | null | undefined,
  roles: readonly Role[],
): Promise<string> {
  const verifiedUserId = requireUserId(userId);
  await requireAnyRole(verifiedUserId, roles);
  return verifiedUserId;
}

export function assertHasAnyRole(userRoles: readonly Role[], allowedRoles: readonly Role[]): void {
  const roleSet = new Set(userRoles);
  const hasAtLeastOne = allowedRoles.some((role) => roleSet.has(role));

  if (!hasAtLeastOne) {
    throw new AuthorizationError();
  }
}
