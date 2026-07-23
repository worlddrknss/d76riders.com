/**
 * Username (handle) rules, shared by the signup form, the profile editor, the
 * availability endpoint, and the server actions that write the value — so the
 * inline "available" tick and the eventual save can never disagree.
 */

/** How long a rider must wait between handle changes. */
export const HANDLE_CHANGE_DAYS = 28;

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])?$/;

/** Handles are stored lowercase; this is the one place that decides that. */
export function normalizeUsername(value: unknown): string {
  return (value?.toString() ?? "").trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return HANDLE_PATTERN.test(username);
}

export const USERNAME_RULE_MESSAGE =
  "Username must be 3-24 characters and use only lowercase letters, numbers, dots, underscores, or hyphens.";

/** Handles that would collide with a route or impersonate the platform. */
const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "account",
  "auth",
  "d76",
  "d76riders",
  "district76",
  "events",
  "help",
  "login",
  "logout",
  "magazine",
  "messages",
  "moderator",
  "new",
  "notifications",
  "official",
  "r",
  "roads",
  "search",
  "settings",
  "signup",
  "staff",
  "support",
  "sub-communities",
  "system",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED.has(username);
}

/**
 * Days left before `handleChangedAt` clears the cooldown. 0 means it's free to
 * change now — including a rider who has never changed it (null).
 */
export function handleCooldownDaysLeft(handleChangedAt: Date | null | undefined, now: Date = new Date()): number {
  if (!handleChangedAt) return 0;
  const elapsedMs = now.getTime() - handleChangedAt.getTime();
  const windowMs = HANDLE_CHANGE_DAYS * 24 * 60 * 60 * 1000;
  if (elapsedMs >= windowMs) return 0;
  // Round up: with 2.1 days to go, "3 days" over-promises but never under-promises.
  return Math.ceil((windowMs - elapsedMs) / (24 * 60 * 60 * 1000));
}

export function cooldownMessage(daysLeft: number): string {
  return `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;
}

/** Response shape of GET /api/riders/username-available. */
export type UsernameCheck = {
  available: boolean;
  /** Why not, when unavailable — shown verbatim under the field. */
  reason?: string;
  /** True when it's the caller's current handle, so the UI can stay neutral. */
  current?: boolean;
};
