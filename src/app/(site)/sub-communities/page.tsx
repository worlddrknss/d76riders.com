import Link from "next/link";
import { OG_IMAGE } from "@/lib/og";
import type { Metadata } from "next";
import { Users } from "lucide-react";

import { CreateCrewDialog } from "@/components/crews/create-crew-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sub-communities",
  description:
    "Find your people — city and interest sub-communities within the District 76 Riders community.",
  alternates: { canonical: "/sub-communities" },
  openGraph: {
    images: OG_IMAGE,
    title: "Sub-communities — District 76 Riders",
    description: "Groups within the community — by city, by ride style, by whatever brings riders together.",
  },
};

export const dynamic = "force-dynamic";

export default async function CrewsPage() {
  const now = new Date();
  const currentUser = await getCurrentUser();

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
    <AppShell>
      <PageHeader
        icon={Users}
        title="Find Your Sub-community"
        subtitle="District 76 is one community with a lot of different riders in it. Sub-communities are where you find your city and the riders who ride like you do. Join as many as you want, or none at all."
        action={currentUser ? <CreateCrewDialog /> : undefined}
      />

      {crews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <Users className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No sub-communities yet.</p>
            </div>
          ) : (
            <StaggerList className="grid gap-4 sm:grid-cols-2">
              {crews.map((crew) => {
                const nextEvent = crew.events[0];

                return (
                  <StaggerItem key={crew.id}>
                    <Link
                      href={`/sub-communities/${crew.slug}`}
                      className="block h-full rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-sunset/40"
                    >
                      <div className="flex items-center gap-3">
                        {crew.avatarUrl ? (
                           
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
                  </StaggerItem>
                );
              })}
        </StaggerList>
      )}
    </AppShell>
  );
}
