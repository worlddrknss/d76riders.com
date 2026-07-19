import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  CalendarDays,
  MapPin,
  MessageSquare,
  Radio,
  Star,
  Wrench,
} from "lucide-react";

import { FeedLeftRail } from "@/components/feed/feed-left-rail";
import { FeedRightRail } from "@/components/feed/feed-right-rail";
import { CoverPhoto } from "@/components/profile/cover-photo";
import { JournalGrid } from "@/components/profile/journal-grid";
import { DEFAULT_TIMEZONE, formatEventDate, formatEventTimeShort, isSameDayInTz } from "@/lib/datetime";
import { getFeedEntries } from "@/lib/feed";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

const LIVE_WINDOW_MS = 5 * 60 * 1000;

type Viewer = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverPosition: number;
  location: string | null;
};

/** A titled dashboard card. */
function DashCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-4 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <Icon className="h-4 w-4 text-sunset" />
        {title}
      </h2>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/**
 * The logged-in home: a rider dashboard. Leads with a personal cockpit — your
 * next ride (with check-in / live status), maintenance due, and unread alerts —
 * then your stats, a peek at the feed, and roads to explore. The full social
 * feed lives at /feed.
 */
export async function RiderDashboard({ viewer }: { viewer: Viewer }) {
  const now = new Date();

  const [following, nextRsvp, serviceRecords, unreadNotifs, unreadDms, statsRider, roads] = await Promise.all([
    prisma.riderFollow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } }),
    prisma.rsvp.findFirst({
      where: { riderId: viewer.id, status: "GOING", event: { startsAt: { gte: now } } },
      orderBy: { event: { startsAt: "asc" } },
      select: {
        event: {
          select: { id: true, slug: true, title: true, startsAt: true, timezone: true, meetLocation: true },
        },
      },
    }),
    prisma.serviceRecord.findMany({
      where: { riderId: viewer.id, OR: [{ remindAt: { not: null } }, { remindMileage: { not: null } }] },
      select: {
        id: true,
        title: true,
        remindAt: true,
        remindMileage: true,
        bike: { select: { name: true, make: true, model: true, currentMileage: true } },
      },
    }),
    prisma.activity.count({ where: { riderId: viewer.id, readAt: null } }),
    prisma.directMessage.count({
      where: {
        readAt: null,
        senderId: { not: viewer.id },
        conversation: { OR: [{ riderAId: viewer.id }, { riderBId: viewer.id }] },
      },
    }),
    prisma.rider.findUnique({
      where: { id: viewer.id },
      select: {
        // "Rides" = group rides actually attended (checked in), not the legacy
        // seed-only ridesCompleted counter.
        _count: { select: { journalEntries: true, badges: true, eventCheckIns: true } },
        trust: { select: { level: true, milesRidden: true } },
        badges: { orderBy: { awardedAt: "desc" }, take: 4, select: { badge: { select: { name: true } } } },
      },
    }),
    prisma.road.findMany({
      orderBy: [{ qualityScore: "desc" }, { scenicRating: "desc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        name: true,
        scenicRating: true,
        qualityScore: true,
        distanceMiles: true,
        galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
      },
    }),
  ]);

  // Maintenance currently due: reminder date passed, or odometer reached the mark.
  const dueServices = serviceRecords.filter((s) => {
    const dateDue = s.remindAt != null && s.remindAt <= now;
    const mileageDue =
      s.remindMileage != null && s.bike.currentMileage != null && s.bike.currentMileage >= s.remindMileage;
    return dateDue || mileageDue;
  });

  // Depends on the queries above: feed needs knownIds; ride status needs the event id.
  const knownIds = [...new Set([...following.map((f) => f.followingId), viewer.id])];
  const [feed, checkIn, liveCount] = await Promise.all([
    getFeedEntries({ viewerId: viewer.id, knownIds, mode: "foryou", take: 3 }),
    nextRsvp
      ? prisma.eventCheckIn.findUnique({
          where: { eventId_riderId: { eventId: nextRsvp.event.id, riderId: viewer.id } },
          select: { checkOutAt: true },
        })
      : Promise.resolve(null),
    nextRsvp
      ? prisma.liveLocation.count({
          where: { eventId: nextRsvp.event.id, updatedAt: { gte: new Date(now.getTime() - LIVE_WINDOW_MS) } },
        })
      : Promise.resolve(0),
  ]);

  const nextEvent = nextRsvp?.event ?? null;
  const eventTz = nextEvent?.timezone ?? DEFAULT_TIMEZONE;
  const isRideDay = nextEvent ? isSameDayInTz(nextEvent.startsAt, eventTz) : false;
  const isLive = liveCount > 0;
  const onRide = checkIn != null && checkIn.checkOutAt == null;

  const viewerAvatar = mediaUrl(viewer.avatarUrl);
  const viewerCover = mediaUrl(viewer.coverUrl);
  const firstName = viewer.name.split(" ")[0];

  // One-line "here's your day" summary.
  const summaryParts: string[] = [];
  if (nextEvent) summaryParts.push(isRideDay ? "You're riding today" : "1 ride coming up");
  if (dueServices.length) summaryParts.push(`${dueServices.length} service${dueServices.length > 1 ? "s" : ""} due`);
  const alertCount = unreadNotifs + unreadDms;
  if (alertCount) summaryParts.push(`${alertCount} new alert${alertCount > 1 ? "s" : ""}`);
  const summary = summaryParts.length
    ? summaryParts.join(" · ")
    : "You're all caught up. Time to plan the next one.";

  return (
    <section className="page-shell">
      <div className="content-wrap">
        {/* Cover + avatar header — matches the feed and profile so the whole app
            feels like one continuous space. */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <CoverPhoto url={viewerCover || null} name={viewer.name} position={viewer.coverPosition} canReposition={false} />
          <div className="relative px-5 pb-5 sm:px-8">
            <div className="absolute -top-12 left-5 sm:-top-16 sm:left-8">
              {viewerAvatar ? (
                <img
                  src={viewerAvatar}
                  alt={viewer.name}
                  className="h-24 w-24 rounded-full border-4 border-surface object-cover shadow-lift sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-sunset/10 font-display text-4xl font-bold text-sunset shadow-lift sm:h-32 sm:w-32">
                  {viewer.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="pt-14 sm:pl-36 sm:pt-4">
              <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-3xl">{viewer.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                <span>@{viewer.handle}</span>
                {viewer.location && (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>·</span>
                    <MapPin className="h-3 w-3 text-sunset" />
                    {viewer.location}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Left sidebar: quick nav + discovery widgets */}
          <aside className="hidden space-y-4 lg:block">
            <FeedLeftRail handle={viewer.handle} />
            <FeedRightRail viewerId={viewer.id} knownIds={knownIds} />
          </aside>

          <main className="w-full min-w-0 space-y-6">
            {/* Greeting */}
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Welcome back, {firstName}</h2>
              <p className="mt-0.5 text-sm text-muted">{summary}</p>
            </div>

            {/* Cockpit */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {/* Next ride */}
              <DashCard title="Next Ride" icon={CalendarDays}>
                {nextEvent ? (
                  <>
                    <Link href={`/events/${nextEvent.slug}`} className="group block">
                      <p className="font-semibold text-ink group-hover:text-sunset">{nextEvent.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatEventDate(nextEvent.startsAt, eventTz)} · {formatEventTimeShort(nextEvent.startsAt, eventTz)}
                      </p>
                      {nextEvent.meetLocation && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                          <MapPin className="h-3 w-3 text-sunset" />
                          {nextEvent.meetLocation}
                        </p>
                      )}
                    </Link>
                    <div className="mt-auto pt-3">
                      {isLive ? (
                        <Link
                          href={`/events/${nextEvent.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95"
                        >
                          <Radio className="h-3.5 w-3.5" /> Live now · {liveCount} on the road
                        </Link>
                      ) : isRideDay ? (
                        <Link
                          href={`/events/${nextEvent.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sunset px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#cf5a26]"
                        >
                          {onRide ? "You're checked in" : "Check in"}
                        </Link>
                      ) : (
                        <Link href={`/events/${nextEvent.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-sunset">
                          View ride <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">No rides on your calendar yet.</p>
                    <Link href="/events" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-sunset">
                      Browse events <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </DashCard>

              {/* Maintenance */}
              <DashCard title="Maintenance" icon={Wrench}>
                {dueServices.length ? (
                  <>
                    <ul className="space-y-2">
                      {dueServices.slice(0, 3).map((s) => {
                        const bikeLabel = s.bike.name || [s.bike.make, s.bike.model].filter(Boolean).join(" ") || "Your bike";
                        const reason =
                          s.remindMileage != null && s.bike.currentMileage != null && s.bike.currentMileage >= s.remindMileage
                            ? `Due at ${s.remindMileage.toLocaleString()} mi`
                            : "Overdue";
                        return (
                          <li key={s.id} className="text-sm leading-tight">
                            <span className="font-medium text-ink">{s.title}</span>
                            <span className="block text-xs text-muted">
                              {bikeLabel} · {reason}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      href={`/r/${viewer.handle}?tab=garage`}
                      className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-sunset"
                    >
                      Log service <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">Nothing due. Your bikes are good to go.</p>
                    <Link
                      href={`/r/${viewer.handle}?tab=garage`}
                      className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-sunset"
                    >
                      Open garage <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </DashCard>

              {/* Alerts */}
              <DashCard title="Alerts" icon={Bell}>
                {alertCount ? (
                  <div className="space-y-2">
                    {unreadDms > 0 && (
                      <Link
                        href="/messages"
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition hover:border-sunset"
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <MessageSquare className="h-4 w-4 text-sunset" /> Messages
                        </span>
                        <span className="rounded-full bg-sunset px-2 py-0.5 text-xs font-bold text-white">{unreadDms}</span>
                      </Link>
                    )}
                    {unreadNotifs > 0 && (
                      <Link
                        href="/notifications"
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition hover:border-sunset"
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <Bell className="h-4 w-4 text-sunset" /> Notifications
                        </span>
                        <span className="rounded-full bg-sunset px-2 py-0.5 text-xs font-bold text-white">{unreadNotifs}</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted">You&apos;re all caught up. No new messages or notifications.</p>
                )}
              </DashCard>
            </div>

            {/* Stats + recent badges */}
            {statsRider && (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{statsRider._count.eventCheckIns}</p>
                    <p className="text-xs text-muted">Rides</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{statsRider._count.journalEntries}</p>
                    <p className="text-xs text-muted">Posts</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{statsRider._count.badges}</p>
                    <p className="text-xs text-muted">Badges</p>
                  </div>
                  {statsRider.trust && (
                    <div>
                      <p className="font-display text-2xl font-bold text-ink">
                        {statsRider.trust.milesRidden.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted">Miles</p>
                    </div>
                  )}
                </div>
                {statsRider.badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                    {statsRider.badges.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted"
                      >
                        <Award className="h-3 w-3 text-sunset" />
                        {b.badge.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* From your feed */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">From your feed</h3>
                <Link href="/feed" className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                  Open full feed <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {feed.length > 0 ? (
                <div className="mt-4">
                  <JournalGrid entries={feed} isOwner={false} isAuthenticated layout="feed" />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-canvas p-8 text-center">
                  <p className="text-sm font-medium text-ink">Your feed is just getting started</p>
                  <p className="mt-1 text-sm text-muted">Follow a few riders and their posts show up here.</p>
                  <Link
                    href="/feed?feed=discover"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
                  >
                    Discover riders <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Roads to explore */}
            {roads.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">Roads to explore</h3>
                  <Link href="/roads" className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                    All roads <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {roads.map((road) => {
                    const img = mediaUrl(road.galleryItems[0]?.url);
                    const rating = road.qualityScore ?? road.scenicRating;
                    return (
                      <Link
                        key={road.id}
                        href={`/roads/${road.slug}`}
                        className="group relative h-28 overflow-hidden rounded-lg bg-cover bg-center"
                        style={
                          img
                            ? { backgroundImage: `url(${img})` }
                            : { backgroundImage: "linear-gradient(150deg,#2b2822,#15130f)" }
                        }
                      >
                        <div className="absolute inset-0 bg-linear-to-t from-asphalt/90 via-asphalt/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                          <p className="line-clamp-1 text-sm font-bold leading-tight">{road.name}</p>
                          <div className="mt-0.5 flex items-center justify-between text-[0.65rem] text-slate-200">
                            <span>{road.distanceMiles ? `${road.distanceMiles} mi` : "—"}</span>
                            {rating != null && (
                              <span className="inline-flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-sunset text-sunset" />
                                {rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
