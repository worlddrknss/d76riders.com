import type { Metadata } from "next";
import Link from "next/link";
import { type ActivityType, NewsPostStatus } from "@prisma/client";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  MapPin,
  Newspaper,
  Route,
  Signal,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";
import { StoryBar } from "@/components/stories/story-bar";
import type { StoryGroup } from "@/components/stories/story-viewer";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/ui/motion";
import { DEFAULT_TIMEZONE, eventDayMonth, formatEventDate } from "@/lib/datetime";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const statIcons = [Users, Bike, Route, MapPin];

// Only celebratory, public-facing activity belongs on the homepage feed —
// deliberately excludes internal/organizer/notification noise like check-ins,
// missing-checkout alerts, RSVPs, mentions, and rider-down incidents.
const PUBLIC_ACTIVITY_TYPES: ActivityType[] = [
  "JOINED",
  "POSTED_JOURNAL",
  "CREATED_EVENT",
  "COMPLETED_RIDE",
  "ADDED_BIKE",
  "ADDED_MODIFICATION",
  "BADGE_EARNED",
  "CHALLENGE_COMPLETED",
  "UPLOADED_PHOTO",
];

const exploreFeatures = [
  {
    title: "Riders",
    href: "/r",
    icon: Users,
    description: "Meet the people behind the engines. Find riders near you and see who shares your roads.",
  },
  {
    title: "Garage",
    href: "/profile",
    icon: Wrench,
    description: "Browse the machines our members ride, from naked bikes to long-haul adventure rigs.",
  },
  {
    title: "Events",
    href: "/events",
    icon: CalendarDays,
    description: "Weekly group rides with clear routes, meetup points, and pace guidance for every level.",
  },
  {
    title: "Magazine",
    href: "/magazine",
    icon: Newspaper,
    description: "Ride reports, gear talk, and stories from riders who actually log the miles.",
  },
];

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.warn("Home query failed:", error);
    return fallback;
  }
}

export default async function Home() {
  const now = new Date();
  const upcomingEvents = await safeQuery(
    () => prisma.rideEvent.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: {
        galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
        rsvps: {
          where: { status: "GOING" },
          include: {
            rider: { select: { avatarUrl: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    [],
  );

  const publishedNews = "newsPost" in prisma
    ? await safeQuery(
        () => prisma.newsPost.findMany({
          where: { status: NewsPostStatus.PUBLISHED },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          take: 3,
        }),
        [],
      )
    : [];

  // Featured rides are the community's public shop window — hand-picked in
  // /admin/community and shown above the regular upcoming list.
  const featuredEvents = await safeQuery(
    () =>
      prisma.rideEvent.findMany({
        where: { featured: true, startsAt: { gte: now }, status: "UPCOMING" },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          startsAt: true,
          timezone: true,
          meetLocation: true,
          distanceMiles: true,
          crew: { select: { name: true, slug: true } },
          galleryItems: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
          _count: { select: { rsvps: true } },
        },
      }),
    [],
  );

  // Real community photos for the "From Our Community" mosaic — the latest shots
  // from anywhere riders share them (event galleries, builds, journals, roads).
  const galleryPhotos = await safeQuery(
    () =>
      prisma.galleryItem.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, url: true },
      }),
    [],
  );

  const sponsors = await safeQuery(
    () =>
      prisma.sponsor.findMany({
        // Mirrors /sponsors: nothing public until it's been approved.
        where: { active: true, status: "APPROVED" },
        orderBy: [{ tier: "asc" }, { name: "asc" }],
        take: 6,
        select: { id: true, name: true, logoUrl: true, websiteUrl: true },
      }),
    [],
  );

  const roads = await safeQuery(
    () => prisma.road.findMany({
      include: {
        galleryItems: { orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: [{ scenicRating: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    [],
  );

  const [userCount, bikeCount, eventCount, roadCount, activities] = await Promise.all([
    safeQuery(() => prisma.user.count(), 0),
    safeQuery(() => prisma.bike.count(), 0),
    safeQuery(() => prisma.rideEvent.count(), 0),
    safeQuery(() => prisma.road.count(), 0),
    safeQuery(() => prisma.activity.findMany({
      where: { type: { in: PUBLIC_ACTIVITY_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        summary: true,
        createdAt: true,
        rider: { select: { name: true, handle: true, avatarUrl: true } },
      },
    }), []),
  ]);

  // Stories — active (unexpired) ride photos, grouped by rider for the story bar.
  const currentUser = await getCurrentUser();
  const viewer = currentUser
    ? await safeQuery(
        () => prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true, avatarUrl: true } }),
        null,
      )
    : null;

  const activeStories = await safeQuery(
    () =>
      prisma.story.findMany({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          caption: true,
          createdAt: true,
          rider: { select: { id: true, name: true, handle: true, avatarUrl: true } },
        },
      }),
    [],
  );

  const storyMap = new Map<string, StoryGroup>();
  for (const s of activeStories) {
    let group = storyMap.get(s.rider.id);
    if (!group) {
      group = {
        rider: { id: s.rider.id, name: s.rider.name, handle: s.rider.handle, avatarUrl: mediaUrl(s.rider.avatarUrl) },
        stories: [],
      };
      storyMap.set(s.rider.id, group);
    }
    group.stories.push({ id: s.id, url: s.url, caption: s.caption, createdAt: s.createdAt.toISOString() });
  }
  const storyGroups = [...storyMap.values()].sort((a, b) => {
    // Viewer's own stories first, then most-recently-posted riders.
    if (viewer) {
      if (a.rider.id === viewer.id) return -1;
      if (b.rider.id === viewer.id) return 1;
    }
    const at = new Date(a.stories[a.stories.length - 1].createdAt).getTime();
    const bt = new Date(b.stories[b.stories.length - 1].createdAt).getTime();
    return bt - at;
  });
  const showStoryBar = Boolean(viewer) || storyGroups.length > 0;

  const statValues = [
    { label: "Community Members", value: String(userCount), delta: "Live from database" },
    { label: "Registered Bikes", value: String(bikeCount), delta: "Live from database" },
    { label: "Group Rides", value: String(eventCount), delta: "Live from database" },
    { label: "Featured Roads", value: String(roadCount), delta: "Live from database" },
  ];

  return (
    <div>
      {/* HERO */}
      <PageHero
        image={siteImages.hero}
        video="/images/hero/video-v2.mp4"
        variant="home"
        title={<>DISTRICT <span className="text-sunset">76</span></>}
        description="Founded in Clarksville, Tennessee and built for riders across the state. All bikes, all skill levels, no politics. Just rides worth showing up for."
        actions={
          <>
            <Link
              href="/join"
              className="group inline-flex items-center gap-2 rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#cf5a26]"
            >
              Join District 76
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center rounded-md border border-white/30 bg-black/20 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:border-white/45 hover:bg-black/30 hover:text-white"
            >
              View Upcoming Rides
            </Link>
          </>
        }
      />

      {/* STORIES */}
      {showStoryBar && (
        <section className="w-full border-b border-border bg-canvas">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <StoryBar
              groups={storyGroups}
              currentRiderId={viewer?.id ?? null}
              canPost={Boolean(viewer)}
              currentAvatarUrl={viewer ? mediaUrl(viewer.avatarUrl) : null}
            />
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">About District 76</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              All Bikes. All Riders.
            </h2>
            <p className="mt-4 max-w-lg text-muted">
              Founded in Clarksville and open to everyone on two wheels across Tennessee. No patches, no ranks, no brand requirements. Show up, ride, be cool.
            </p>
            <Link href="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              Learn More <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
          <FadeUp delay={0.15}>
            <div
              className="h-64 w-full rounded-xl bg-cover bg-center shadow-lift sm:h-80"
              style={{ backgroundImage: `url(${siteImages.aboutTown})` }}
              role="img"
              aria-label="Aerial view of Clarksville, Tennessee"
            />
          </FadeUp>
        </div>
      </section>

      {/* EXPLORE FEATURES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-asphalt sm:text-3xl">
              Explore <span className="text-sunset">District 76</span>
            </h2>
            <p className="mt-2 text-sm text-muted">Your gateway to the core of our riding community.</p>
          </FadeUp>
          <StaggerList className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {exploreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={feature.title}>
                  <Link
                    href={feature.href}
                    className="group block rounded-xl border border-border bg-surface p-6 shadow-soft transition hover:border-sunset"
                  >
                    <Icon className="h-8 w-8 text-sunset" />
                    <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-asphalt">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted">{feature.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sunset">
                      Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </div>
      </section>

      {/* EMERGENCY RESPONSE */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <FadeUp>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Rider Safety</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Your Helmet Speaks When You Can&apos;t
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
                Every District 76 rider gets an NFC emergency ID sticker for their helmet. If you go down, a first responder taps it with their phone and instantly sees your emergency contacts, blood type, allergies, and medical conditions. No app needed.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href="/emergency-response" className="inline-flex items-center gap-2 rounded-md bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]">
                  Learn More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Free pickup at events and meetups. Shipping available for remote members.
              </p>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-2xl font-bold text-sunset">NFC</p>
                  <p className="mt-1 text-sm text-slate-300">NTAG215 rewritable tags</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-2xl font-bold text-sunset">0</p>
                  <p className="mt-1 text-sm text-slate-300">App downloads needed</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-2xl font-bold text-sunset">AES</p>
                  <p className="mt-1 text-sm text-slate-300">Encrypted medical data</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-2xl font-bold text-sunset">You</p>
                  <p className="mt-1 text-sm text-slate-300">Control what&apos;s visible</p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* FEATURED RIDES — public highlights, curated in /admin/community */}
      {featuredEvents.length > 0 ? (
        <section className="w-full bg-canvas">
          <div className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
            <FadeUp className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">
                Featured Rides
              </h2>
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]"
              >
                View All Rides <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeUp>

            <StaggerList className="mt-6 grid gap-6 md:grid-cols-3">
              {featuredEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-sunset/30 bg-surface shadow-soft transition hover:border-sunset"
                  >
                    <div className="relative h-40 w-full bg-linear-to-br from-asphalt to-sunset/40">
                      {event.galleryItems[0] ? (
                         
                        <img
                          src={mediaUrl(event.galleryItems[0].url) ?? ""}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sunset px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-soft">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-sunset">
                        {formatEventDate(event.startsAt, event.timezone ?? DEFAULT_TIMEZONE)}
                        {event.crew ? ` · ${event.crew.name}` : ""}
                      </p>
                      <h3 className="mt-1 font-display text-base font-semibold text-ink">{event.title}</h3>
                      {event.excerpt ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{event.excerpt}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted">
                        {[
                          event.meetLocation,
                          event.distanceMiles ? `${event.distanceMiles} mi` : null,
                          `${event._count.rsvps} going`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </section>
      ) : null}

      {/* UPCOMING RIDES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <FadeUp className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Upcoming Rides</h2>
            <Link href="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              View All Rides <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
          <StaggerList className="mt-6 grid gap-6 md:grid-cols-3">
            {(upcomingEvents.length > 0 ? upcomingEvents : []).map((ride, i) => (
              <StaggerItem key={ride.title}>
                <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <div
                  className="relative h-44 bg-cover bg-center"
                  style={{ backgroundImage: `url(${mediaUrl(ride.galleryItems[0]?.url) || siteImages.rides[i % siteImages.rides.length]})` }}
                >
                  <div className="absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-white text-asphalt shadow-soft">
                    <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sunset">{eventDayMonth(ride.startsAt, ride.timezone ?? DEFAULT_TIMEZONE).month}</span>
                    <span className="font-display text-xl font-bold leading-none">{String(eventDayMonth(ride.startsAt, ride.timezone ?? DEFAULT_TIMEZONE).day).padStart(2, "0")}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold text-asphalt">{ride.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-sunset" />{ride.meetLocation || ride.ksuLocation || "Location TBD"}</span>
                    <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5 text-sunset" />{ride.distanceMiles ? `${ride.distanceMiles} miles` : "Distance TBD"}</span>
                    <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{ride.difficulty ? ride.difficulty.replaceAll("_", " ") : "TBD"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs font-medium text-muted">
                      {ride.rsvps.length > 0
                        ? `${ride.rsvps.length} registered`
                        : "Starts " + ride.startsAt.toLocaleDateString()}
                    </span>
                    <div className="flex -space-x-2">
                      {ride.rsvps.slice(0, 3).map((rsvp) => (
                        rsvp.rider.avatarUrl ? (
                          <img
                            key={rsvp.id}
                            src={mediaUrl(rsvp.rider.avatarUrl)}
                            alt={rsvp.rider.name}
                            className="h-6 w-6 rounded-full border-2 border-surface object-cover"
                          />
                        ) : (
                          <span
                            key={rsvp.id}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-sunset/80 text-[0.5rem] font-bold text-white"
                          >
                            {rsvp.rider.name.charAt(0).toUpperCase()}
                          </span>
                        )
                      ))}
                      {ride.rsvps.length > 3 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-canvas text-[0.5rem] font-bold text-muted">
                          +{ride.rsvps.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* FEATURED ROADS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <FadeUp className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Featured Roads</h2>
            <Link href="/roads" className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              Explore All Roads <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
          <StaggerList className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {roads.map((road, i) => (
              <StaggerItem key={road.name}>
                <article
                  className="relative h-32 overflow-hidden rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${mediaUrl(road.galleryItems[0]?.url) || siteImages.roads[i % siteImages.roads.length]})` }}
                >
                  <div className="absolute inset-0 bg-linear-to-t from-asphalt/90 via-asphalt/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <h3 className="text-sm font-bold leading-tight">{road.name}</h3>
                    <div className="mt-1 flex items-center justify-between text-[0.65rem] text-slate-200">
                      <span className="inline-flex items-center gap-1"><Route className="h-3 w-3 text-sunset" />{road.distanceMiles ? `${road.distanceMiles} mi` : "TBD"}</span>
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-sunset text-sunset" />{road.scenicRating ? road.scenicRating.toFixed(1) : "N/A"}</span>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* STATS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <ScaleIn>
            <div className="grid grid-cols-2 gap-6 rounded-2xl border border-border bg-surface p-6 shadow-soft md:grid-cols-4">
            {statValues.map((stat, i) => {
              const Icon = statIcons[i] ?? Users;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <Icon className="h-7 w-7 shrink-0 text-sunset" />
                  <div>
                    <p className="font-display text-2xl font-bold text-asphalt">{stat.value}</p>
                    <p className="text-xs text-muted">{stat.label}</p>
                    <p className="text-[0.65rem] font-semibold text-forest">{stat.delta}</p>
                  </div>
                </div>
              );
            })}
          </div>
          </ScaleIn>
        </div>
      </section>

      {/* ACTIVITY + GALLERY */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FadeUp>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Recent Community Activity</h2>
            <div className="mt-5 space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted">No community activity yet — it&apos;ll show up here as riders post, ride, and earn badges.</p>
              ) : (
                activities.map((item) => {
                  const name = item.rider?.name ?? "A rider";
                  // Recast the rider's own-feed phrasing into third person for a
                  // public feed: "You earned…" → "<name> earned…".
                  const rest = item.summary.replace(/^You\s+/i, "");
                  const phrased = rest.charAt(0).toLowerCase() + rest.slice(1);
                  const avatar = item.rider?.avatarUrl ? mediaUrl(item.rider.avatarUrl) : null;
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      {avatar ? (
                        <img src={avatar} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-sunset/15 text-center text-sm font-bold leading-8 text-sunset">
                          {name.charAt(0)}
                        </span>
                      )}
                      <div>
                        <p className="text-sm text-asphalt">
                          {item.rider?.handle ? (
                            <Link href={`/r/${item.rider.handle}`} className="font-semibold text-ink hover:text-sunset">{name}</Link>
                          ) : (
                            <span className="font-semibold text-ink">{name}</span>
                          )}{" "}
                          {phrased}
                        </p>
                        <p className="text-xs text-muted">
                          {item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link href="/gallery" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              View All Activity <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
          {galleryPhotos.length > 0 && (
            <FadeUp delay={0.15}>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">From Our Community</h2>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div
                  className="col-span-2 row-span-2 min-h-45 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${mediaUrl(galleryPhotos[0].url)})` }}
                />
                {galleryPhotos.slice(1, 5).map((photo) => (
                  <div
                    key={photo.id}
                    className="h-21 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${mediaUrl(photo.url)})` }}
                  />
                ))}
              </div>
              <Link href="/gallery" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                View Full Gallery <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeUp>
          )}
        </div>
      </section>

      {/* THE HAPPENINGS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <FadeUp className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">
                The <span className="text-sunset">Happenings</span>
              </h2>
              <p className="mt-1 text-sm text-muted">Latest stories from the District 76 community.</p>
            </div>
            <Link href="/magazine" className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              All News <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
          <StaggerList className="mt-6 grid gap-6 md:grid-cols-3">
            {publishedNews.map((article, i) => (
              <StaggerItem key={article.slug}>
                <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <Link href={`/magazine/${article.slug}`} className="block">
                  <div
                    className="relative h-44 bg-cover bg-center"
                    style={{ backgroundImage: `url(${article.coverImageUrl || siteImages.galleryPage[i % siteImages.galleryPage.length]})` }}
                  >
                    <span className="absolute bottom-0 left-0 bg-sunset px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                      {article.category}
                    </span>
                  </div>
                </Link>
                <div className="p-5">
                  <Link href={`/magazine/${article.slug}`}>
                    <h3 className="font-display text-base font-bold uppercase tracking-tight text-asphalt hover:text-sunset">
                      {article.title}
                    </h3>
                  </Link>
                  <p className="mt-2 text-sm text-muted">{article.excerpt}</p>
                  <Link href={`/magazine/${article.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                    Read More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* SPONSORS */}
      {sponsors.length > 0 ? (
        <section className="w-full border-t border-border bg-canvas">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <FadeUp className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">
                Sponsors
              </h2>
              <Link
                href="/shops?tier=sponsor"
                className="inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]"
              >
                All Sponsors <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeUp>

            <StaggerList className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {sponsors.map((sponsor) => {
                const logo = (
                  <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-surface p-3 transition hover:border-ink/30">
                    {sponsor.logoUrl ? (
                       
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-xs font-semibold text-muted">{sponsor.name}</span>
                    )}
                  </div>
                );

                return (
                  <StaggerItem key={sponsor.id}>
                    {sponsor.websiteUrl ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={sponsor.name}
                      >
                        {logo}
                      </a>
                    ) : (
                      logo
                    )}
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${siteImages.ctaRoad})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-asphalt/85" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <FadeUp className="text-white">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready to Ride With Us?</h2>
            <p className="mt-2 max-w-lg text-slate-200">
              Join District 76 and connect with riders, discover new roads, and be part of something more.
            </p>
          </FadeUp>
          <FadeUp delay={0.1} className="flex items-center gap-4">
            <Link href="/join" className="rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf5a26]">
              Join the Community
            </Link>
            <Link href="/about" className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-sunset">
              Learn More <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
