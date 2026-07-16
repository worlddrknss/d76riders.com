import Link from "next/link";
import type { Metadata } from "next";
import { Target } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { SkillTrackCard } from "@/components/reputation/skill-track-card";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Skill Tracks",
  description:
    "Track your group-riding skills with District 76 Riders — formation riding, cornering, hand signals, and group braking.",
  alternates: { canonical: "/skills" },
  openGraph: {
    title: "Skill Tracks — District 76 Riders",
    description: "The skills that make group riding safe, and where you are on each.",
  },
};

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const currentUser = await getCurrentUser();

  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const tracks = await prisma.skillTrack.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      riderSkills: rider ? { where: { riderId: rider.id } } : false,
    },
  });

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.skills}
        eyebrow="Progression"
        title="Skill Tracks"
        description="The skills that make group riding safe. Set your own level as you learn — a ride organizer can verify it, and mentor level is theirs to award."
      />

      <section className="page-shell">
        <div className="content-wrap space-y-6">
          {!rider ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-soft">
              <Link href="/login?next=/skills" className="font-semibold text-sunset">
                Log in
              </Link>{" "}
              to track your skills.
            </p>
          ) : null}

          {tracks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Target className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No skill tracks are set up yet.</p>
            </div>
          ) : (
            <StaggerList className="space-y-3">
              {tracks.map((track) => {
                const mine = Array.isArray(track.riderSkills) ? track.riderSkills[0] : undefined;
                return (
                  <StaggerItem key={track.id}>
                    <SkillTrackCard
                      slug={track.slug}
                      name={track.name}
                      description={track.description}
                      icon={track.icon}
                      level={mine?.level ?? null}
                      verified={Boolean(mine?.verifiedAt)}
                      editable={Boolean(rider)}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </div>
      </section>
    </div>
  );
}
