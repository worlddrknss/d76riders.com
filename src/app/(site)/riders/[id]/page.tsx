import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, BookText, CalendarDays, Camera, HardHat, MapPin, Route, Shield, Video } from "lucide-react";

import { JournalComposerBar } from "@/components/profile/journal-composer-bar";
import { JournalInteractions } from "@/components/profile/journal-interactions";
import { ProfileSectionEdit } from "@/components/profile/profile-section-edit";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { Linkify } from "@/components/ui/linkify";
import { VideoEmbed } from "@/components/ui/video-embed";
import { JournalList } from "@/components/profile/journal-list";
import { ReportJournalButton } from "@/components/profile/report-journal-button";
import { toggleRiderFollowAction } from "@/app/(site)/garage/mine/actions";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const rider = await prisma.rider.findUnique({
    where: { handle: id },
    select: { name: true, handle: true, bio: true, avatarUrl: true },
  });
  if (!rider) return { title: "Rider Not Found" };

  const description = rider.bio
    ? rider.bio.slice(0, 160)
    : `${rider.name}'s rider profile on District 76 Riders.`;

  return {
    title: `${rider.name} (@${rider.handle})`,
    description,
    alternates: { canonical: `/riders/${rider.handle}` },
    openGraph: {
      title: `${rider.name} — District 76 Rider`,
      description,
      ...(rider.avatarUrl && { images: [{ url: mediaUrl(rider.avatarUrl) }] }),
    },
  };
}

export default async function RiderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const rider = await prisma.rider.findUnique({
    where: { handle: id },
    select: {
      id: true,
      userId: true,
      handle: true,
      name: true,
      bio: true,
      location: true,
      avatarUrl: true,
      coverUrl: true,
      yearsRiding: true,
      favoriteRoad: true,
      joinedAt: true,
      youtubeUrl: true,
      tiktokUrl: true,
      instagramUrl: true,
      twitterUrl: true,
      bikes: {
        select: { id: true, name: true, make: true, model: true },
      },
      journalEntries: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          body: true,
          videoUrl: true,
          createdAt: true,
          galleryItems: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { url: true, caption: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
          likes: {
            select: { riderId: true },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            take: 10,
            select: {
              id: true,
              body: true,
              createdAt: true,
              author: { select: { name: true, handle: true } },
            },
          },
        },
      },
      events: {
        orderBy: { startsAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
        },
      },
      followers: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          follower: {
            select: {
              handle: true,
              name: true,
            },
          },
        },
      },
      following: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          following: {
            select: {
              handle: true,
              name: true,
            },
          },
        },
      },
      followedEvents: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          event: {
            select: {
              slug: true,
              title: true,
              startsAt: true,
            },
          },
        },
      },
      gearItems: {
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          category: true,
          name: true,
          brand: true,
          model: true,
        },
      },
    },
  });

  if (!rider) {
    notFound();
  }

  const [hostedEvents, rsvpEvents] = await Promise.all([
    prisma.rideEvent.findMany({
      where: { hostId: rider.id },
      select: { id: true },
    }),
    prisma.rsvp.findMany({
      where: { riderId: rider.id, status: "GOING" },
      select: { eventId: true },
    }),
  ]);

  const participatedEventIds = new Set<string>();
  for (const event of hostedEvents) {
    participatedEventIds.add(event.id);
  }
  for (const rsvp of rsvpEvents) {
    participatedEventIds.add(rsvp.eventId);
  }
  const ridesFromEvents = participatedEventIds.size;

  const isOwner = currentUser?.id === rider.userId;
  const avatar = mediaUrl(rider.avatarUrl);
  const cover = mediaUrl(rider.coverUrl);
  const viewer = currentUser
    ? await prisma.rider.findUnique({
        where: { userId: currentUser.id },
        select: {
          id: true,
          following: {
            where: { following: { handle: rider.handle } },
            select: { followingId: true },
          },
        },
      })
    : null;
  const isFollowing = Boolean(viewer?.following.length);

  const profileData = isOwner ? {
    displayName: rider.name,
    username: rider.handle,
    avatarUrl: avatar || "",
    bio: rider.bio || "",
    location: rider.location || "",
    favoriteRoad: rider.favoriteRoad || "",
    yearStartedRiding: rider.yearsRiding != null ? Math.max(1900, new Date().getFullYear() - rider.yearsRiding) : null,
    youtubeHandle: rider.youtubeUrl?.replace(/^https:\/\/youtube\.com\/@?/, "") || "",
    tiktokHandle: rider.tiktokUrl?.replace(/^https:\/\/tiktok\.com\/@?/, "") || "",
    instagramHandle: rider.instagramUrl?.replace(/^https:\/\/instagram\.com\//, "") || "",
    twitterHandle: rider.twitterUrl?.replace(/^https:\/\/x\.com\//, "") || "",
  } : null;

  return (
    <section className="page-shell">
      <div className="content-wrap">
        {isOwner && <RiderSubNav handle={rider.handle} />}

        {cover && (
          <div className="mb-6 h-40 w-full overflow-hidden rounded-xl sm:h-52">
            <img src={cover} alt={`${rider.name}'s cover`} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="grid items-start gap-8 lg:grid-cols-[20rem_1fr]">
          {/* SIDEBAR */}
          <aside className="space-y-5">
            <div className="group rounded-xl border border-border bg-surface p-6 shadow-soft">
              {isOwner && profileData && (
                <div className="mb-3 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                  <ProfileSectionEdit section="identity" data={profileData} />
                </div>
              )}
              {avatar ? (
                <img src={avatar} alt={rider.name} className="mx-auto h-32 w-32 rounded-full border-2 border-sunset/30 object-cover" />
              ) : (
                <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-sunset/10 font-display text-4xl font-bold text-sunset">
                  {rider.name.charAt(0)}
                </div>
              )}
              <h1 className="mt-4 text-center font-display text-2xl font-semibold text-ink">{rider.name}</h1>
              <p className="text-center text-sm text-muted">@{rider.handle}</p>
              {rider.location && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted">
                  <MapPin className="h-3 w-3 text-sunset" />{rider.location}
                </p>
              )}
              <p className="mt-3 text-center text-sm text-muted">{rider.bio || "No bio yet."}</p>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <Link href={isOwner ? "/garage/mine" : `/garage/${rider.handle}`} className="rounded-lg bg-canvas p-3 text-center transition hover:ring-2 hover:ring-sunset/40">
                  <p className="font-display text-xl font-bold text-asphalt">{rider.bikes.length}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Bikes</p>
                </Link>
                <div className="rounded-lg bg-canvas p-3 text-center">
                  <p className="font-display text-xl font-bold text-asphalt">{ridesFromEvents}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Rides</p>
                </div>
                <div className="rounded-lg bg-canvas p-3 text-center">
                  <p className="font-display text-xl font-bold text-asphalt">{rider.yearsRiding ?? "—"}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Years</p>
                </div>
              </div>

              {!isOwner && currentUser ? (
                <form action={toggleRiderFollowAction.bind(null, rider.handle)} className="mt-4">
                  <button type="submit" className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt transition hover:border-asphalt">
                    {isFollowing ? "Following" : "Follow Rider"}
                  </button>
                </form>
              ) : null}

              {isOwner && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/garage/mine" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-asphalt transition hover:border-asphalt">
                    <Bike className="h-3 w-3" />Garage
                  </Link>
                  <Link href="/gear/mine" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-asphalt transition hover:border-asphalt">
                    <Shield className="h-3 w-3" />Gear
                  </Link>
                </div>
              )}

              {/* Details */}
              <div className="group/details mt-5 space-y-3 border-t border-border pt-4 text-left">
                {isOwner && profileData && (
                  <div className="flex justify-end opacity-0 transition-opacity group-hover/details:opacity-100">
                    <ProfileSectionEdit section="details" data={profileData} />
                  </div>
                )}
                <dl className="space-y-3">
                {rider.favoriteRoad && (
                  <div className="flex items-start gap-3">
                    <Route className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                    <div>
                      <dt className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Favorite Road</dt>
                      <dd className="text-sm font-medium text-asphalt">{rider.favoriteRoad}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                  <div>
                    <dt className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Member Since</dt>
                    <dd className="text-sm font-medium text-asphalt">
                      {rider.joinedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </dd>
                  </div>
                </div>
                {rider.bikes.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Bike className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                    <div>
                      <dt className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Bikes</dt>
                      <dd className="text-sm font-medium text-asphalt">
                        {rider.bikes.map((b) => b.name || `${b.make} ${b.model ?? ""}`.trim()).join(", ")}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
              </div>
            </div>

            {/* Social Links */}
            {(rider.youtubeUrl || rider.tiktokUrl || rider.instagramUrl || rider.twitterUrl || isOwner) && (
              <div className="group rounded-xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt">Socials</h2>
                  {isOwner && profileData && (
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">
                      <ProfileSectionEdit section="socials" data={profileData} />
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {rider.youtubeUrl && (
                    <a href={rider.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-ink hover:text-sunset">
                      <Video className="h-4 w-4 text-red-600" /> YouTube
                    </a>
                  )}
                  {rider.tiktokUrl && (
                    <a href={rider.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-ink hover:text-sunset">
                      <Video className="h-4 w-4 text-ink" /> TikTok
                    </a>
                  )}
                  {rider.instagramUrl && (
                    <a href={rider.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-ink hover:text-sunset">
                      <Camera className="h-4 w-4 text-pink-500" /> Instagram
                    </a>
                  )}
                  {rider.twitterUrl && (
                    <a href={rider.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-ink hover:text-sunset">
                      <BookText className="h-4 w-4 text-sky-500" /> X / Twitter
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Events */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-asphalt">
                  <CalendarDays className="h-3.5 w-3.5 text-sunset" />Events
                </h2>
                {isOwner && (
                  <Link href="/events/new" className="text-xs font-semibold text-sunset hover:underline">+ New</Link>
                )}
              </div>
              {rider.events.length === 0 ? (
                <p className="mt-3 text-xs text-muted">No events yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {rider.events.map((event) => (
                    <li key={event.id}>
                      <Link href={`/events/${event.slug}`} className="block rounded-lg bg-canvas px-3 py-2 text-sm transition hover:bg-sunset/5">
                        <span className="font-medium text-ink">{event.title}</span>
                        <span className="ml-2 text-xs text-muted">{event.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Gear */}
            {rider.gearItems.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-asphalt">
                    <HardHat className="h-3.5 w-3.5 text-sunset" />Gear
                  </h2>
                  <Link href={`/gear/${rider.handle}`} className="text-xs font-semibold text-sunset hover:underline">View All</Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {rider.gearItems.slice(0, 6).map((item) => (
                    <li key={item.id} className="rounded-lg bg-canvas px-3 py-2">
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-muted">
                        {[item.brand, item.model].filter(Boolean).join(" ") || item.category.replaceAll("_", " ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* People */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt">People</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Followers</p>
                  <div className="mt-2 space-y-1.5">
                    {rider.followers.length > 0 ? rider.followers.map((entry) => (
                      <Link key={entry.follower.handle} href={`/riders/${entry.follower.handle}`} className="block text-sm text-ink hover:text-sunset">
                        {entry.follower.name}
                      </Link>
                    )) : <p className="text-xs text-muted">No followers yet.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Following</p>
                  <div className="mt-2 space-y-1.5">
                    {rider.following.length > 0 ? rider.following.map((entry) => (
                      <Link key={entry.following.handle} href={`/riders/${entry.following.handle}`} className="block text-sm text-ink hover:text-sunset">
                        {entry.following.name}
                      </Link>
                    )) : <p className="text-xs text-muted">Not following anyone yet.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Tracked Events</p>
                  <div className="mt-2 space-y-1.5">
                    {rider.followedEvents.length > 0 ? rider.followedEvents.map((entry) => (
                      <Link key={entry.event.slug} href={`/events/${entry.event.slug}`} className="block text-sm text-ink hover:text-sunset">
                        {entry.event.title}
                      </Link>
                    )) : <p className="text-xs text-muted">No followed events yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN — Ride Journal */}
          <div>
            {isOwner && (
              <div>
                <JournalComposerBar
                  avatarUrl={avatar}
                  firstName={rider.name.split(" ")[0]}
                />
              </div>
            )}

            <div className="mt-6 space-y-5">
              {rider.journalEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
                  <BookText className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-3 text-sm text-muted">
                    {isOwner
                      ? "No ride journal entries yet. Click the + button above to share your first ride story."
                      : `${rider.name} hasn\u0027t shared any ride journal entries yet.`}
                  </p>
                </div>
              ) : isOwner ? (
                <JournalList entries={rider.journalEntries.map((entry) => ({
                  ...entry,
                  likeCount: entry._count.likes,
                  commentCount: entry._count.comments,
                  isLiked: viewer ? entry.likes.some((l) => l.riderId === viewer.id) : false,
                  comments: entry.comments.map((c) => ({
                    id: c.id,
                    body: c.body,
                    authorName: c.author.name,
                    authorHandle: c.author.handle,
                    createdAt: c.createdAt.toISOString(),
                  })),
                  profileUrl: `/riders/${rider.handle}`,
                }))} />
              ) : (
                rider.journalEntries.map((entry) => {
                  const entryImage = entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null;
                  const isLiked = viewer ? entry.likes.some((l) => l.riderId === viewer.id) : false;
                  const entryComments = entry.comments.map((c) => ({
                    id: c.id,
                    body: c.body,
                    authorName: c.author.name,
                    authorHandle: c.author.handle,
                    createdAt: c.createdAt.toISOString(),
                  }));
                  return (
                    <article key={entry.id} className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                      {currentUser && (
                        <div className="absolute right-3 top-3 z-10">
                          <ReportJournalButton entryId={entry.id} />
                        </div>
                      )}
                      {entryImage ? (
                        <div className="aspect-square w-full overflow-hidden">
                          <img src={entryImage} alt={entry.galleryItems[0]?.caption || entry.title || "Ride"} className="h-full w-full object-cover" />
                        </div>
                      ) : entry.videoUrl ? (
                        <VideoEmbed url={entry.videoUrl} />
                      ) : null}
                      <div className="p-5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-sunset">
                          {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {entry.title && <h3 className="mt-1 font-display text-lg font-semibold text-ink">{entry.title}</h3>}
                        <p className="mt-2 leading-relaxed text-muted"><Linkify text={entry.body} /></p>
                      </div>
                      <JournalInteractions
                        entryId={entry.id}
                        likeCount={entry._count.likes}
                        commentCount={entry._count.comments}
                        isLiked={isLiked}
                        isAuthenticated={Boolean(currentUser)}
                        comments={entryComments}
                        entryUrl={`/riders/${rider.handle}`}
                      />
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
