import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { CreateChallengeDialog } from "@/components/challenges/create-challenge-dialog";
import { PageHero } from "@/components/layout/page-hero";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { challengeStatus, daysLeft, formatProgress } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Challenges",
  description:
    "Time-boxed riding challenges for the District 76 Riders community — miles, rides, and ride leading.",
  alternates: { canonical: "/challenges" },
  openGraph: {
    title: "Challenges — District 76 Riders",
    description: "Pick a challenge, ride it out, earn the badge.",
  },
};

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const currentUser = await getCurrentUser();
  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  // Only crews this rider is in can be the scope of a challenge they set.
  const myCrews = rider
    ? (
        await prisma.crewMember.findMany({
          where: { riderId: rider.id, crew: { active: true } },
          select: { crew: { select: { id: true, name: true } } },
          orderBy: { crew: { name: "asc" } },
        })
      ).map((row) => row.crew)
    : [];

  const challenges = await prisma.challenge.findMany({
    where: { active: true },
    orderBy: [{ endsAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      metric: true,
      goal: true,
      startsAt: true,
      endsAt: true,
      crew: { select: { name: true } },
      _count: { select: { entries: true } },
      entries: rider ? { where: { riderId: rider.id }, select: { progress: true, completedAt: true } } : false,
    },
  });

  const now = new Date();
  const groups = [
    { key: "ACTIVE" as const, label: "On now" },
    { key: "UPCOMING" as const, label: "Coming up" },
    { key: "ENDED" as const, label: "Finished" },
  ];

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.challenges}
        eyebrow="Progression"
        title="Challenges"
        description="Pick one, ride it out, earn the badge. Only rides inside the challenge window count — that's the point of the deadline."
        actions={rider ? <CreateChallengeDialog crews={myCrews} /> : undefined}
      />

      <section className="page-shell">
        <div className="content-wrap space-y-8">
          {challenges.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Trophy className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No challenges running yet.</p>
            </div>
          ) : (
            groups.map((group) => {
              const inGroup = challenges.filter((c) => challengeStatus(c, now) === group.key);
              if (inGroup.length === 0) return null;

              return (
                <div key={group.key}>
                  <h2 className="font-display text-lg font-semibold text-ink">{group.label}</h2>

                  <StaggerList className="mt-3 grid gap-4 sm:grid-cols-2">
                    {inGroup.map((challenge) => {
                      const mine = Array.isArray(challenge.entries) ? challenge.entries[0] : undefined;
                      const pct = mine ? Math.min(100, Math.round((mine.progress / challenge.goal) * 100)) : 0;
                      const left = daysLeft(challenge.endsAt, now);

                      return (
                        <StaggerItem key={challenge.id}>
                          <Link
                            href={`/challenges/${challenge.slug}`}
                            className="block h-full rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-sunset/40"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {challenge.crew ? (
                                <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">
                                  {challenge.crew.name}
                                </span>
                              ) : null}
                              {group.key === "ACTIVE" ? (
                                <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                                  {left} day{left === 1 ? "" : "s"} left
                                </span>
                              ) : null}
                              {mine?.completedAt ? (
                                <span className="rounded-full border border-forest/40 bg-forest/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-forest">
                                  Done
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-2 font-display text-lg font-semibold text-ink">{challenge.name}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-muted">{challenge.description}</p>

                            {mine ? (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-muted">
                                  <span>{formatProgress(mine.progress, challenge.goal, challenge.metric)}</span>
                                  <span className="font-semibold text-ink">{pct}%</span>
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                                  <div
                                    className={`h-full rounded-full ${mine.completedAt ? "bg-forest" : "bg-sunset"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-muted">
                                {formatProgress(0, challenge.goal, challenge.metric).split(" / ")[1]} ·{" "}
                                {challenge._count.entries} rider
                                {challenge._count.entries === 1 ? "" : "s"} in
                              </p>
                            )}
                          </Link>
                        </StaggerItem>
                      );
                    })}
                  </StaggerList>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
