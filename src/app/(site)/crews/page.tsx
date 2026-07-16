import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Crews | District 76 Riders",
  description:
    "Find your people — sportbike, touring, beginner, and women riders crews within District 76 Riders.",
};

export const dynamic = "force-dynamic";

export default async function CrewsPage() {
  const now = new Date();

  const crews = await prisma.crew.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      avatarUrl: true,
      open: true,
      _count: { select: { members: true } },
      events: {
        where: { startsAt: { gte: now }, status: "UPCOMING" },
        orderBy: { startsAt: "asc" },
        take: 1,
        select: { title: true, slug: true, startsAt: true },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Community</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Crews</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          District 76 is one club with a lot of different riders in it. Crews are where you find the ones who
          ride like you do.
        </p>
      </header>

      {crews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-canvas p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">No crews yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {crews.map((crew) => {
            const nextEvent = crew.events[0];
            return (
              <Link
                key={crew.id}
                href={`/crews/${crew.slug}`}
                className="rounded-xl border border-border bg-canvas p-5 transition hover:border-ink/30"
              >
                <div className="flex items-center gap-3">
                  {crew.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={crew.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-sunset/10 text-sunset">
                      <Users className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold text-ink">{crew.name}</h2>
                    <p className="text-xs text-muted">
                      {crew._count.members} member{crew._count.members === 1 ? "" : "s"}
                      {crew.open ? "" : " · invite only"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted">{crew.description}</p>

                {nextEvent ? (
                  <p className="mt-3 text-xs font-semibold text-sunset">
                    Next: {nextEvent.title} ·{" "}
                    {nextEvent.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
