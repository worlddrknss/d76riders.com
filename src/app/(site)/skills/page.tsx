import Link from "next/link";
import type { Metadata } from "next";
import { Target } from "lucide-react";

import { SkillTrackCard } from "@/components/reputation/skill-track-card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Skill Tracks | District 76 Riders",
  description: "Track your group-riding skills — formation, cornering, and hand signals.",
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
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Progression</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Skill Tracks</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Track where you are on the skills that make group riding safe. Set your own level as you learn — a
          ride organizer can verify it, and mentor level is theirs to award.
        </p>
      </header>

      {!rider ? (
        <p className="mt-6 rounded-xl border border-border bg-canvas p-4 text-sm text-muted">
          <Link href="/login?next=/skills" className="font-semibold text-sunset">
            Log in
          </Link>{" "}
          to track your skills.
        </p>
      ) : null}

      {tracks.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-canvas p-12 text-center">
          <Target className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">No skill tracks are set up yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tracks.map((track) => {
            const mine = Array.isArray(track.riderSkills) ? track.riderSkills[0] : undefined;
            return (
              <SkillTrackCard
                key={track.id}
                slug={track.slug}
                name={track.name}
                description={track.description}
                icon={track.icon}
                level={mine?.level ?? null}
                verified={Boolean(mine?.verifiedAt)}
                editable={Boolean(rider)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
