import Link from "next/link";
import { OG_IMAGE } from "@/lib/og";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { CrewMembershipButton } from "@/components/crews/crew-membership-button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const crew = await prisma.crew.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!crew) return { title: "Crew Not Found" };

  return {
    title: `${crew.name} | District 76 Riders`,
    description: crew.description,
    alternates: { canonical: `/crews/${slug}` },
    openGraph: {
    images: OG_IMAGE, title: crew.name, description: crew.description, type: "website" },
  };
}

export default async function CrewDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const now = new Date();

  const crew = await prisma.crew.findUnique({
    where: { slug },
    include: {
      members: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          role: true,
          rider: {
            select: { handle: true, name: true, avatarUrl: true, trust: { select: { level: true } } },
          },
        },
      },
      events: {
        orderBy: { startsAt: "desc" },
        take: 10,
        select: { id: true, slug: true, title: true, startsAt: true, status: true },
      },
    },
  });

  if (!crew || !crew.active) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const isMember = rider
    ? Boolean(
        await prisma.crewMember.findUnique({
          where: { crewId_riderId: { crewId: crew.id, riderId: rider.id } },
          select: { id: true },
        }),
      )
    : false;

  const upcoming = crew.events.filter((event) => event.startsAt >= now && event.status === "UPCOMING");
  const past = crew.events.filter((event) => event.startsAt < now || event.status === "COMPLETED");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/crews" className="text-xs font-semibold text-muted hover:text-ink">
        ← All crews
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {crew.avatarUrl ? (
             
            <img
              src={crew.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-sunset/10 text-sunset">
              <Users className="h-6 w-6" />
            </span>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{crew.name}</h1>
            <p className="text-xs text-muted">
              {crew.members.length} member{crew.members.length === 1 ? "" : "s"}
              {crew.open ? "" : " · invite only"}
            </p>
          </div>
        </div>

        {rider ? <CrewMembershipButton slug={crew.slug} isMember={isMember} open={crew.open} /> : null}
      </header>

      <p className="mt-4 text-sm text-muted">{crew.description}</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Upcoming rides</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing on the calendar yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition hover:border-sunset/40"
                >
                  <span className="font-semibold text-ink">{event.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {event.startsAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Members</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {crew.members.map((member) => (
            <li key={member.id}>
              <Link
                href={`/r/${member.rider.handle}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40"
              >
                {member.rider.avatarUrl ? (
                   
                  <img
                    src={member.rider.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-[0.6rem] font-bold text-muted">
                    {member.rider.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{member.rider.name}</span>
                  <span className="block truncate text-xs text-muted">@{member.rider.handle}</span>
                </span>
                {member.role === "LEAD" ? (
                  <span className="shrink-0 rounded-full border border-sunset/40 bg-sunset/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-sunset">
                    Lead
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Past rides</h2>
          <ul className="mt-3 space-y-1">
            {past.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="text-sm text-muted hover:text-ink">
                  {event.title} ·{" "}
                  {event.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
