import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeFeed } from "@/components/feed/home-feed";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Feed",
  alternates: { canonical: "/feed" },
};

/**
 * The full social feed. Home (/) is the rider dashboard now; this is where the
 * For You / Following / Discover / Mine stream lives. Signed-in only — visitors
 * bounce to the marketing home.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  const viewer = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: {
      id: true,
      name: true,
      handle: true,
      avatarUrl: true,
      coverUrl: true,
      coverPosition: true,
      location: true,
    },
  });
  if (!viewer) redirect("/");

  const { feed } = await searchParams;
  const mode =
    feed === "discover" || feed === "mine" || feed === "following" ? feed : "foryou";

  return <HomeFeed viewer={viewer} mode={mode} />;
}
