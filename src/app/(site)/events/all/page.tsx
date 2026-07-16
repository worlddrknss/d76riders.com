import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Route, Search, Signal, Users } from "lucide-react";
import Link from "next/link";

import { PUBLIC_EVENT_STATUSES } from "@/lib/events";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

type SearchParams = {
  q?: string;
  difficulty?: string;
  time?: string; // "upcoming" | "past" | "all"
  page?: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function AllEventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const difficulty = params.difficulty || "";
  const timeFilter = params.time || "upcoming";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const now = new Date();

  // Build where clause
  const where: Record<string, unknown> = {
    // Cancelled and draft rides never appear in the listing — see PUBLIC_EVENT_STATUSES.
    status: { in: PUBLIC_EVENT_STATUSES },
  };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { meetLocation: { contains: query, mode: "insensitive" } },
    ];
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (timeFilter === "upcoming") {
    where.startsAt = { gte: now };
  } else if (timeFilter === "past") {
    where.startsAt = { lt: now };
  }

  const [events, totalCount] = await Promise.all([
    prisma.rideEvent.findMany({
      where,
      orderBy: { startsAt: timeFilter === "past" ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        // GOING only — every RSVP row would count riders who said NOT_GOING.
        _count: { select: { rsvps: { where: { status: "GOING" } } } },
      },
    }),
    prisma.rideEvent.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Build URL helper for pagination/filters
  function buildUrl(overrides: Partial<SearchParams>): string {
    const merged = { q: query, difficulty, time: timeFilter, page: String(page), ...overrides };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.difficulty) sp.set("difficulty", merged.difficulty);
    if (merged.time && merged.time !== "upcoming") sp.set("time", merged.time);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    const qs = sp.toString();
    return `/events/all${qs ? `?${qs}` : ""}`;
  }

  const difficulties = [
    { value: "", label: "All Paces" },
    { value: "BEGINNER_FRIENDLY", label: "Beginner Friendly" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "SCENIC", label: "Scenic" },
  ];

  const timeOptions = [
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
    { value: "all", label: "All" },
  ];

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-8">
        {/* HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
              <Link href="/" className="text-muted transition hover:text-sunset">Home</Link>
              <ChevronRight className="h-3 w-3 text-border" />
              <Link href="/events" className="text-muted transition hover:text-sunset">Events</Link>
              <ChevronRight className="h-3 w-3 text-border" />
              <span className="text-asphalt">All Events</span>
            </nav>
            <h1 className="font-display text-3xl font-semibold text-ink">All Events</h1>
            <p className="mt-1 text-sm text-muted">{totalCount} event{totalCount !== 1 ? "s" : ""} found</p>
          </div>
          <Link
            href="/events/new"
            className="rounded-md bg-sunset px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#cf5a26]"
          >
            Create Event
          </Link>
        </div>

        {/* SEARCH + FILTERS */}
        <form method="GET" action="/events/all" className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-50 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search events..."
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-sunset focus:outline-none focus:ring-1 focus:ring-sunset"
            />
          </div>

          <select
            name="difficulty"
            defaultValue={difficulty}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none focus:ring-1 focus:ring-sunset"
          >
            {difficulties.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          <select
            name="time"
            defaultValue={timeFilter}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none focus:ring-1 focus:ring-sunset"
          >
            {timeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-asphalt px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-asphalt/80"
          >
            Search
          </button>
        </form>

        {/* EVENT GRID */}
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted shadow-soft">
            No events match your search. Try different filters or create a new event.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const isPast = event.startsAt < now;
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:border-sunset/30 hover:shadow-md"
                >
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-sunset">
                        {formatDate(event.startsAt)}
                      </p>
                      {isPast && (
                        <span className="rounded-full bg-canvas px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-muted">Past</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-asphalt group-hover:text-sunset">
                      {event.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted">
                      {event.excerpt || event.description || "No description."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {event.meetLocation ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-sunset" />
                          {/* Inline rather than a second line: this is a compact
                              wrap row. The venue name alone is ambiguous for a
                              chain — "QuikTrip" could be any of them. */}
                          {event.meetAddress ? `${event.meetLocation} · ${event.meetAddress}` : event.meetLocation}
                        </span>
                      ) : null}
                      {event.distanceMiles ? (
                        <span className="inline-flex items-center gap-1"><Route className="h-3 w-3 text-sunset" />{event.distanceMiles} mi</span>
                      ) : null}
                      {event.difficulty ? (
                        <span className="inline-flex items-center gap-1"><Signal className="h-3 w-3 text-sunset" />{event.difficulty.replaceAll("_", " ")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <span className="text-xs text-muted">
                      {!isPast ? `Meetup ${formatTime(event.startsAt)}` : "Completed"}
                    </span>
                    {event._count.rsvps > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Users className="h-3 w-3 text-sunset" />
                        {event._count.rsvps} rider{event._count.rsvps !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-sunset hover:text-sunset"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-border">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}

            <span className="px-3 text-sm text-muted">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-sunset hover:text-sunset"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-border">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
