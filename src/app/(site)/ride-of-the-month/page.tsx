import Link from "next/link";
import { Trophy } from "lucide-react";

import { VoteButton } from "@/components/events/vote-button";
import { DEFAULT_TIMEZONE, formatEventDate } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { periodForDate, periodLabel } from "@/lib/ride-of-month";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ride of the Month",
  description: "Vote for the community's best ride each month.",
};

export default async function RideOfMonthPage() {
  const period = periodForDate();

  const currentUser = await getCurrentUser();
  const rider = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  // Completed rides from this month are the ballot. Fetch recent completed events
  // and keep the ones whose local month matches the current period.
  const [recentCompleted, myVote, voteGroups, pastGroups] = await Promise.all([
    prisma.rideEvent.findMany({
      where: { status: "COMPLETED" },
      orderBy: { startsAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        timezone: true,
        distanceMiles: true,
        galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
      },
    }),
    rider
      ? prisma.rideOfMonthVote.findUnique({
          where: { riderId_period: { riderId: rider.id, period } },
          select: { eventId: true },
        })
      : Promise.resolve(null),
    prisma.rideOfMonthVote.groupBy({ by: ["eventId"], where: { period }, _count: { eventId: true } }),
    prisma.rideOfMonthVote.groupBy({
      by: ["period", "eventId"],
      where: { period: { not: period } },
      _count: { eventId: true },
    }),
  ]);

  const countByEvent = new Map(voteGroups.map((g) => [g.eventId, g._count.eventId]));
  const ballot = recentCompleted
    .filter((e) => periodForDate(e.startsAt) === period)
    .map((e) => ({ ...e, votes: countByEvent.get(e.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || b.startsAt.getTime() - a.startsAt.getTime());

  // Past winners: top-voted event per prior period.
  const winnerByPeriod = new Map<string, { eventId: string; votes: number }>();
  for (const g of pastGroups) {
    const best = winnerByPeriod.get(g.period);
    if (!best || g._count.eventId > best.votes) {
      winnerByPeriod.set(g.period, { eventId: g.eventId, votes: g._count.eventId });
    }
  }
  const winnerEventIds = [...winnerByPeriod.values()].map((w) => w.eventId);
  const winnerEvents = winnerEventIds.length
    ? await prisma.rideEvent.findMany({
        where: { id: { in: winnerEventIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];
  const winnerEventMap = new Map(winnerEvents.map((e) => [e.id, e]));
  const pastWinners = [...winnerByPeriod.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([p, w]) => ({ period: p, votes: w.votes, event: winnerEventMap.get(w.eventId) }))
    .filter((w) => w.event);

  return (
    <section className="page-shell">
      <div className="content-wrap max-w-3xl space-y-8">
        <header>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sunset">
            <Trophy className="h-4 w-4" />
            Ride of the Month
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{periodLabel(period)}</h1>
          <p className="mt-2 text-sm text-muted">
            Vote for your favorite ride from this month. One vote per rider — change it anytime before the month ends.
          </p>
        </header>

        {ballot.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-canvas p-12 text-center text-sm text-muted">
            No completed rides this month yet. Once a ride wraps up, it lands on the ballot here.
          </p>
        ) : (
          <ol className="space-y-3">
            {ballot.map((e, i) => {
              const cover = e.galleryItems[0]?.url ? mediaUrl(e.galleryItems[0].url) : null;
              const leading = i === 0 && e.votes > 0;
              return (
                <li
                  key={e.id}
                  className={`flex items-center gap-4 rounded-2xl border bg-surface p-4 shadow-soft ${
                    leading ? "border-sunset/50" : "border-border"
                  }`}
                >
                  <span className="w-6 shrink-0 text-center font-display text-lg font-semibold text-muted">{i + 1}</span>
                  {cover ? (
                    <img src={cover} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-canvas" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/events/${e.slug}`} className="font-display text-lg font-semibold text-ink hover:text-sunset">
                      {e.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatEventDate(e.startsAt, e.timezone ?? DEFAULT_TIMEZONE)}
                      {e.distanceMiles ? ` · ${e.distanceMiles} mi` : ""} · {e.votes} vote{e.votes === 1 ? "" : "s"}
                    </p>
                  </div>
                  {rider ? (
                    <VoteButton eventId={e.id} voted={myVote?.eventId === e.id} />
                  ) : (
                    <Link href="/login" className="shrink-0 text-sm font-semibold text-sunset hover:underline">
                      Log in to vote
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {pastWinners.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Past winners</h2>
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
              {pastWinners.map((w) => (
                <li key={w.period} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{periodLabel(w.period)}</p>
                    <Link href={`/events/${w.event!.slug}`} className="font-medium text-ink hover:text-sunset">
                      {w.event!.title}
                    </Link>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sunset">
                    <Trophy className="h-4 w-4" />
                    {w.votes}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
