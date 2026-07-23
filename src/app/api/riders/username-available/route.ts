import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  cooldownMessage,
  handleCooldownDaysLeft,
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
  USERNAME_RULE_MESSAGE,
  type UsernameCheck,
} from "@/lib/username";

/**
 * Inline availability for the signup and profile-edit username fields, so a
 * rider learns a handle is taken while typing rather than on submit.
 *
 * Open to signed-out callers because signup needs it, which is safe: handles
 * are already public at /r/<handle>, so a yes/no here reveals nothing that
 * loading a profile page wouldn't. It only ever answers about one handle at a
 * time and returns no rider data.
 */
export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("username") ?? "";
  const username = normalizeUsername(raw);

  if (!username) {
    return Response.json({ available: false, reason: "Pick a username." } satisfies UsernameCheck);
  }
  if (!isValidUsername(username)) {
    return Response.json({ available: false, reason: USERNAME_RULE_MESSAGE } satisfies UsernameCheck);
  }
  if (isReservedUsername(username)) {
    return Response.json({ available: false, reason: "That username is reserved." } satisfies UsernameCheck);
  }

  const currentUser = await getCurrentUser();
  const viewer = currentUser?.id
    ? await prisma.rider.findUnique({
        where: { userId: currentUser.id },
        select: { handle: true, handleChangedAt: true },
      })
    : null;

  // Their own handle is neither taken nor a change — say so plainly instead of
  // reporting "already taken" against themselves.
  if (viewer && viewer.handle === username) {
    return Response.json({ available: true, current: true } satisfies UsernameCheck);
  }

  // A rider still inside the cooldown can't take it even if it's free.
  if (viewer) {
    const daysLeft = handleCooldownDaysLeft(viewer.handleChangedAt);
    if (daysLeft > 0) {
      return Response.json({ available: false, reason: cooldownMessage(daysLeft) } satisfies UsernameCheck);
    }
  }

  const taken = await prisma.rider.findUnique({ where: { handle: username }, select: { id: true } });

  return Response.json(
    taken
      ? ({ available: false, reason: "That username is taken." } satisfies UsernameCheck)
      : ({ available: true } satisfies UsernameCheck),
  );
}
