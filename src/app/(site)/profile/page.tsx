import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * "My profile", as a stable URL.
 *
 * A rider's profile lives at /r/<handle>, which nothing that isn't already
 * holding the rider can link to — so anything generic pointed at /profile
 * instead, and /profile was never built. The onboarding quests shipped linking
 * riders to a 404: "Complete your profile" and "Set up your emergency card" both
 * did nothing but break.
 *
 * Query is carried through, so /profile?tab=emergency lands on the right tab.
 */
export default async function ProfileRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login?next=/profile");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { handle: true },
  });

  // Signed in without a rider profile: onboarding is the honest destination.
  if (!rider) {
    redirect("/join");
  }

  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }

  const suffix = query.size > 0 ? `?${query}` : "";
  redirect(`/r/${rider.handle}${suffix}`);
}
