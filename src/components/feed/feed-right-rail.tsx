import Link from "next/link";
import { CalendarDays, Star, TrendingUp, UserPlus } from "lucide-react";

import { toggleRiderFollowAction } from "@/app/(site)/garage/mine/actions";
import { DEFAULT_TIMEZONE, formatEventDate } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <Icon className="h-4 w-4 text-sunset" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Right rail of the home feed — contextual discovery widgets. */
export async function FeedRightRail({
  viewerId,
  knownIds,
}: {
  viewerId: string;
  knownIds: string[];
}) {
  const now = new Date();
  const [trending, spotlight, upcoming, suggestions] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { momentum: { gt: 0 } },
      orderBy: { momentum: "desc" },
      take: 3,
      select: { id: true, title: true, body: true, author: { select: { name: true, handle: true } } },
    }),
    prisma.spotlight.findFirst({
      orderBy: { weekStart: "desc" },
      select: { rider: { select: { name: true, handle: true, avatarUrl: true } } },
    }),
    prisma.rsvp.findMany({
      where: { riderId: viewerId, status: "GOING", event: { startsAt: { gte: now } } },
      orderBy: { event: { startsAt: "asc" } },
      take: 3,
      select: { event: { select: { title: true, slug: true, startsAt: true, timezone: true } } },
    }),
    prisma.rider.findMany({
      where: { id: { notIn: knownIds } },
      orderBy: { joinedAt: "desc" },
      take: 4,
      select: { id: true, name: true, handle: true, avatarUrl: true, location: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      {spotlight && (
        <Card title="Rider Spotlight" icon={Star}>
          <Link href={`/r/${spotlight.rider.handle}`} className="flex items-center gap-3">
            {mediaUrl(spotlight.rider.avatarUrl) ? (
              <img src={mediaUrl(spotlight.rider.avatarUrl) ?? ""} alt={spotlight.rider.name} className="h-12 w-12 rounded-full border-2 border-sunset object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sunset bg-sunset/15 text-lg font-bold text-sunset">
                {spotlight.rider.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{spotlight.rider.name}</p>
              <p className="text-xs text-muted">Featured this week</p>
            </div>
          </Link>
        </Card>
      )}

      {trending.length > 0 && (
        <Card title="Trending This Week" icon={TrendingUp}>
          <ul className="space-y-3">
            {trending.map((post) => (
              <li key={post.id}>
                <Link href={`/p/${post.id}`} className="block">
                  <p className="line-clamp-1 text-sm font-medium text-ink hover:text-sunset">{post.title || post.body}</p>
                  <p className="text-xs text-muted">{post.author.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card title="Your Upcoming Rides" icon={CalendarDays}>
          <ul className="space-y-3">
            {upcoming.map((r) => (
              <li key={r.event.slug}>
                <Link href={`/events/${r.event.slug}`} className="block">
                  <p className="line-clamp-1 text-sm font-medium text-ink hover:text-sunset">{r.event.title}</p>
                  <p className="text-xs text-muted">
                    {formatEventDate(r.event.startsAt, r.event.timezone ?? DEFAULT_TIMEZONE)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card title="Riders to Follow" icon={UserPlus}>
          <ul className="space-y-3">
            {suggestions.map((rider) => (
              <li key={rider.id} className="flex items-center gap-2.5">
                <Link href={`/r/${rider.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  {mediaUrl(rider.avatarUrl) ? (
                    <img src={mediaUrl(rider.avatarUrl) ?? ""} alt={rider.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sm font-bold text-sunset">
                      {rider.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{rider.name}</p>
                    <p className="truncate text-xs text-muted">{rider.location || `@${rider.handle}`}</p>
                  </div>
                </Link>
                <form action={toggleRiderFollowAction.bind(null, rider.handle)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-sunset px-2.5 py-1 text-xs font-semibold text-sunset transition hover:bg-sunset hover:text-white"
                  >
                    Follow
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
