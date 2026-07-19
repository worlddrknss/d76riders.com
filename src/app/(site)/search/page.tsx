import type { Metadata } from "next";
import Link from "next/link";
import { Bike, CalendarDays, Route, Search as SearchIcon, UserRound } from "lucide-react";

import { DEFAULT_TIMEZONE, formatEventDate } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — D76 Riders",
  robots: { index: false, follow: false },
};

function like(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [riders, posts, events, roads] = query
    ? await Promise.all([
        prisma.rider.findMany({
          where: { OR: [{ name: like(query) }, { handle: like(query) }, { location: like(query) }, { bio: like(query) }] },
          take: 8,
          select: { id: true, name: true, handle: true, avatarUrl: true, location: true },
        }),
        prisma.journalEntry.findMany({
          where: { OR: [{ title: like(query) }, { body: like(query) }] },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, title: true, body: true, author: { select: { name: true, handle: true } } },
        }),
        prisma.rideEvent.findMany({
          where: { OR: [{ title: like(query) }, { description: like(query) }] },
          orderBy: { startsAt: "desc" },
          take: 6,
          select: { id: true, title: true, slug: true, startsAt: true, timezone: true },
        }),
        prisma.road.findMany({
          where: { OR: [{ name: like(query) }, { description: like(query) }] },
          take: 6,
          select: { id: true, name: true, slug: true, description: true },
        }),
      ])
    : [[], [], [], []];

  const total = riders.length + posts.length + events.length + roads.length;

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-3xl space-y-6">
        <form action="/search" className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Search riders, posts, events, roads…"
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-9 pr-4 text-sm text-ink shadow-soft focus:border-sunset focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-full bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#cf5a26]">
            Search
          </button>
        </form>

        {!query ? (
          <p className="py-12 text-center text-sm text-muted">Search across riders, ride journals, events, and roads.</p>
        ) : total === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <SearchIcon className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">No results for “{query}”.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {riders.length > 0 && (
              <Section title="Riders" icon={UserRound}>
                {riders.map((r) => (
                  <Link key={r.id} href={`/r/${r.handle}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-canvas">
                    {mediaUrl(r.avatarUrl) ? (
                      <img src={mediaUrl(r.avatarUrl) ?? ""} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sm font-bold text-sunset">{r.name.charAt(0)}</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                      <p className="truncate text-xs text-muted">{r.location || `@${r.handle}`}</p>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {posts.length > 0 && (
              <Section title="Ride journal" icon={Bike}>
                {posts.map((p) => (
                  <Link key={p.id} href={`/p/${p.id}`} className="block rounded-lg px-3 py-2 hover:bg-canvas">
                    <p className="line-clamp-1 text-sm font-medium text-ink">{p.title || p.body}</p>
                    <p className="text-xs text-muted">{p.author.name}</p>
                  </Link>
                ))}
              </Section>
            )}

            {events.length > 0 && (
              <Section title="Events" icon={CalendarDays}>
                {events.map((e) => (
                  <Link key={e.id} href={`/events/${e.slug}`} className="block rounded-lg px-3 py-2 hover:bg-canvas">
                    <p className="line-clamp-1 text-sm font-medium text-ink">{e.title}</p>
                    <p className="text-xs text-muted">{formatEventDate(e.startsAt, e.timezone ?? DEFAULT_TIMEZONE)}</p>
                  </Link>
                ))}
              </Section>
            )}

            {roads.length > 0 && (
              <Section title="Roads" icon={Route}>
                {roads.map((r) => (
                  <Link key={r.id} href={`/roads/${r.slug}`} className="block rounded-lg px-3 py-2 hover:bg-canvas">
                    <p className="line-clamp-1 text-sm font-medium text-ink">{r.name}</p>
                    {r.description ? <p className="line-clamp-1 text-xs text-muted">{r.description}</p> : null}
                  </Link>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <Icon className="h-4 w-4 text-sunset" />
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
