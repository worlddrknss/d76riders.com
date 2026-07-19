import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Bike, BookText, CalendarDays, DollarSign, Image as ImageIcon, Lock, MapPin, MessageSquare, Receipt, Trash2, Video, Wrench } from "lucide-react";

import { JournalGrid } from "@/components/profile/journal-grid";
import { SiInstagram, SiInstagramHex, SiTiktok, SiTiktokHex, SiX, SiXHex, SiYoutube, SiYoutubeHex } from "@icons-pack/react-simple-icons";

import { AppShell } from "@/components/layout/app-shell";
import { CoverPhoto } from "@/components/profile/cover-photo";
import { SocialIconLink } from "@/components/profile/social-icon-link";
import { ProfileEditButton } from "@/components/profile/profile-edit-button";
import { OnboardingQuests } from "@/components/community/onboarding-quests";
import { ActivityFeed } from "@/components/profile/activity-feed";
import { LogRideButton } from "@/components/profile/log-ride-button";
import { ProfileTabs, type ProfileTab } from "@/components/profile/profile-tabs";
import { SkillTrackCard } from "@/components/reputation/skill-track-card";
import { AmbassadorToggle } from "@/components/profile/ambassador-toggle";
import { SpotlightButton } from "@/components/profile/spotlight-button";
import { evaluateQuests } from "@/lib/quests";
import { PublicBikeCard } from "@/components/garage/public-bike-card";
import { BikeCard } from "@/components/garage/bike-card";
import { GarageTabs } from "@/components/garage/garage-tabs";
import { CreateBikeDialog } from "@/components/garage/create-bike-dialog";
import { GearTabbedView } from "@/components/gear/gear-tabbed-view";
import { VideoEmbed as RiderVideoEmbed } from "@/components/videos/video-embed";
import { DEFAULT_TIMEZONE, eventDayMonth } from "@/lib/datetime";
import { toggleRiderFollowAction } from "@/app/(site)/garage/mine/actions";
import { startConversationAction } from "@/app/(site)/messages/actions";
import { canDm } from "@/lib/dm";
import { createGearItemAction, updateGearItemAction, deleteGearItemAction } from "@/app/(site)/gear/mine/actions";
import { deleteVideoAction } from "@/app/(site)/videos/mine/actions";
import { CreateVideoDialog } from "@/components/videos/create-video-dialog";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

// Gear sections (icon resolved by key inside GearTabbedView).
const ownerGearSections = [
  { key: "HELMET", label: "Helmets", description: "Daily, touring, and backup lids.", iconKey: "HardHat" },
  { key: "GLOVES", label: "Gloves", description: "Summer, winter, and rain setups.", iconKey: "Package" },
  { key: "JACKET", label: "Jackets", description: "Mesh, textile, and cold-weather layers.", iconKey: "Shirt" },
  { key: "PANTS", label: "Riding Pants", description: "Protective pants and over-pants.", iconKey: "Shirt" },
  { key: "BOOTS", label: "Boots", description: "Riding boots, shoes, and covers.", iconKey: "Footprints" },
  { key: "CAMERA_GEAR", label: "Camera Gear", description: "Action cams, mounts, and cards.", iconKey: "Camera" },
  { key: "ACCESSORY", label: "Accessories", description: "Intercoms, locks, bags, and extras.", iconKey: "Package" },
];

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

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
    alternates: { canonical: `/r/${rider.handle}` },
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
      isAmbassador: true,
      bio: true,
      location: true,
      timezone: true,
      avatarUrl: true,
      coverUrl: true,
      coverPosition: true,
      yearsRiding: true,
      favoriteRoad: true,
      joinedAt: true,
      youtubeUrl: true,
      tiktokUrl: true,
      instagramUrl: true,
      twitterUrl: true,
      primaryBikeId: true,
      bikes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          make: true,
          model: true,
          year: true,
          type: true,
          engineType: true,
          displacement: true,
          photos: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { url: true, caption: true },
          },
          _count: { select: { modifications: true, serviceRecords: true } },
        },
      },
      videos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, platform: true, title: true, createdAt: true },
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
          saves: {
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
          timezone: true,
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
        orderBy: [{ category: "asc" }, { purchaseDate: "desc" }, { createdAt: "desc" }],
      },
      trust: true,
      badges: {
        orderBy: { awardedAt: "desc" },
        select: {
          id: true,
          awardedAt: true,
          badge: { select: { id: true, name: true, icon: true, tier: true, description: true } },
        },
      },
      skills: {
        orderBy: { skill: { sortOrder: "asc" } },
        select: {
          id: true,
          level: true,
          verifiedAt: true,
          skill: { select: { name: true } },
        },
      },
    },
  });

  if (!rider) {
    notFound();
  }

  const [hostedEvents, rsvpEvents, recentActivities, profilePhotos, profileEvents, rideLogAgg] = await Promise.all([
    prisma.rideEvent.findMany({
      where: { hostId: rider.id },
      select: { id: true },
    }),
    prisma.rsvp.findMany({
      where: { riderId: rider.id, status: "GOING" },
      select: { eventId: true },
    }),
    prisma.activity.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, summary: true, createdAt: true },
    }),
    // Photos tab: everything this rider has shot — their own uploads plus their
    // bikes' and journal posts' images.
    prisma.galleryItem.findMany({
      where: {
        OR: [
          { riderId: rider.id },
          { bike: { riderId: rider.id } },
          { journalEntry: { authorId: rider.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, url: true, caption: true },
    }),
    // Events tab: rides they host or are going to.
    prisma.rideEvent.findMany({
      where: {
        OR: [
          { hostId: rider.id },
          { rsvps: { some: { riderId: rider.id, status: "GOING" } } },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        timezone: true,
        meetLocation: true,
        distanceMiles: true,
        difficulty: true,
        hostId: true,
      },
    }),
    // Self-logged solo rides — added to the displayed rides/miles totals.
    prisma.rideLog.aggregate({
      where: { riderId: rider.id },
      _count: { _all: true },
      _sum: { distanceMiles: true },
    }),
  ]);

  const loggedRides = rideLogAgg._count._all;
  const loggedMiles = rideLogAgg._sum.distanceMiles ?? 0;

  const participatedEventIds = new Set<string>();
  for (const event of hostedEvents) {
    participatedEventIds.add(event.id);
  }
  for (const rsvp of rsvpEvents) {
    participatedEventIds.add(rsvp.eventId);
  }
  const ridesFromEvents = participatedEventIds.size;
  const totalRidesCount = ridesFromEvents + loggedRides;

  const isOwner = currentUser?.id === rider.userId;
  const isAdmin = currentUser?.roles?.includes("ADMINISTRATOR") ?? false;
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
  // DMs require a mutual follow — both riders following each other.
  const canMessage = !isOwner && viewer ? await canDm(viewer.id, rider.id) : false;

  const profileData = isOwner ? {
    displayName: rider.name,
    username: rider.handle,
    avatarUrl: avatar || "",
    bio: rider.bio || "",
    location: rider.location || "",
    timezone: rider.timezone,
    favoriteRoad: rider.favoriteRoad || "",
    yearStartedRiding: rider.yearsRiding != null ? Math.max(1900, new Date().getFullYear() - rider.yearsRiding) : null,
    youtubeHandle: rider.youtubeUrl?.replace(/^https:\/\/youtube\.com\/@?/, "") || "",
    tiktokHandle: rider.tiktokUrl?.replace(/^https:\/\/tiktok\.com\/@?/, "") || "",
    instagramHandle: rider.instagramUrl?.replace(/^https:\/\/instagram\.com\//, "") || "",
    twitterHandle: rider.twitterUrl?.replace(/^https:\/\/x\.com\//, "") || "",
  } : null;

  // Owner-only rich bike data — modification/service costs stay private to the owner.
  const ownerBikes = isOwner && currentUser
    ? await prisma.bike.findMany({
        where: { rider: { userId: currentUser.id } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          make: true,
          name: true,
          model: true,
          year: true,
          type: true,
          engineType: true,
          displacement: true,
          photos: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, url: true, caption: true, createdAt: true },
          },
          modifications: {
            orderBy: { installedAt: "desc" },
            select: { id: true, title: true, category: true, cost: true, mileage: true, notes: true, installedAt: true },
          },
          serviceRecords: {
            orderBy: { servicedAt: "desc" },
            select: { id: true, title: true, serviceType: true, cost: true, mileage: true, notes: true, servicedAt: true },
          },
        },
      })
    : [];

  const totalMods = ownerBikes.reduce((sum, bike) => sum + bike.modifications.length, 0);
  const totalServices = ownerBikes.reduce((sum, bike) => sum + bike.serviceRecords.length, 0);
  const totalSpend = ownerBikes.reduce((sum, bike) => {
    const modSpend = bike.modifications.reduce((s, m) => s + (m.cost ?? 0), 0);
    const svcSpend = bike.serviceRecords.reduce((s, r) => s + (r.cost ?? 0), 0);
    return sum + modSpend + svcSpend;
  }, 0);

  // Brand marks come from Simple Icons — lucide deliberately has no brand icons.
  // `color` is each brand's official hex, applied on hover so the row stays calm
  // until you reach for it.
  const socialAccounts = [
    { label: "Instagram", href: rider.instagramUrl, icon: SiInstagram, color: SiInstagramHex },
    { label: "YouTube", href: rider.youtubeUrl, icon: SiYoutube, color: SiYoutubeHex },
    { label: "TikTok", href: rider.tiktokUrl, icon: SiTiktok, color: SiTiktokHex },
    { label: "X", href: rider.twitterUrl, icon: SiX, color: SiXHex },
  ].filter((social): social is { label: string; href: string; icon: typeof SiX; color: string } =>
    Boolean(social.href),
  );

  const journalForGrid = rider.journalEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    imageUrl: entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null,
    videoUrl: entry.videoUrl,
    dateLabel: entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    likeCount: entry._count.likes,
    commentCount: entry._count.comments,
    isLiked: viewer ? entry.likes.some((l) => l.riderId === viewer.id) : false,
    isSaved: viewer ? entry.saves.some((s) => s.riderId === viewer.id) : false,
    comments: entry.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      authorHandle: c.author.handle,
      createdAt: c.createdAt.toISOString(),
    })),
    authorName: rider.name,
    authorAvatarUrl: avatar,
    profileUrl: `/r/${rider.handle}`,
  }));

  const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-soft";
  const headingClass = "flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-asphalt";

  // ─── Overview tab ───────────────────────────────────────────────
  // Onboarding is the owner's own checklist — never shown to visitors.
  const quests = isOwner ? await evaluateQuests(rider.id) : [];

  // All active badges, so the Overview grid can show earned + locked tiles.
  const allBadges = await prisma.badge.findMany({
    where: { active: true },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    select: { id: true, name: true, tier: true },
  });
  const earnedBadgeMap = new Map(rider.badges.map((held) => [held.badge.id, held.awardedAt]));

  // Skill tracks live on the profile rather than a standalone page: they describe
  // this rider, so they belong with everything else that does.
  const skillTracks = await prisma.skillTrack.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      riderSkills: { where: { riderId: rider.id } },
    },
  });

  // ─── Journal feed — a read-only archive of this rider's posts. Composing
  // and stories moved to the home feed; owners can still edit/delete a post.
  const ridesContent = (
    <div>
      <div>
        {journalForGrid.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <BookText className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">
              {isOwner
                ? "No ride journal entries yet. Post from your home feed to fill this in."
                : `${rider.name} hasn't shared any ride journal entries yet.`}
            </p>
          </div>
        ) : (
          <JournalGrid
            entries={journalForGrid}
            isOwner={isOwner}
            isAuthenticated={Boolean(currentUser)}
            layout="feed"
          />
        )}
      </div>
    </div>
  );

  // Overview — the mock's clean layout: RIDER stat card + Recent Activity, then a
  // Badges grid. Progression, network, and details fold into the stat card.
  const riderStatCard = (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={headingClass}>Rider</h2>
        {isOwner ? <LogRideButton /> : null}
      </div>
      <dl className="mt-2 divide-y divide-border">
        {[
          { label: "Rides", value: totalRidesCount.toLocaleString() },
          { label: "Miles logged", value: loggedMiles.toLocaleString() },
          { label: "Bikes", value: rider.bikes.length.toLocaleString() },
          { label: "Years riding", value: rider.yearsRiding != null ? String(rider.yearsRiding) : "—" },
          { label: "Badges", value: rider.badges.length.toLocaleString() },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-right font-semibold text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const badgesGrid = (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h2 className={headingClass}>Badges</h2>
        <span className="text-xs font-medium normal-case tracking-normal text-muted">
          {rider.badges.length} of {allBadges.length} earned
        </span>
      </div>
      {allBadges.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No badges available yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allBadges.map((b) => {
            const awardedAt = earnedBadgeMap.get(b.id);
            const earned = earnedBadgeMap.has(b.id);
            const tier = b.tier.charAt(0) + b.tier.slice(1).toLowerCase();
            return (
              <div
                key={b.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${earned ? "border-border bg-surface" : "border-dashed border-border opacity-60"}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${earned ? "bg-sunset/12 text-sunset" : "bg-canvas text-muted"}`}>
                  {earned ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{b.name}</p>
                  <p className="text-xs text-muted">
                    {tier}
                    {earned
                      ? awardedAt
                        ? ` · ${awardedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : ""
                      : " · Locked"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const overviewContent = (
    <div className="space-y-6">
      {isOwner ? <OnboardingQuests quests={quests} /> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {riderStatCard}
        <ActivityFeed items={recentActivities} viewAllHref={isOwner ? "/notifications" : undefined} />
      </div>
      {badgesGrid}
    </div>
  );

  // Journal — the rider's posts, full width (no identity sidebar).
  const journalContent = ridesContent;

  // ─── Garage tab ─────────────────────────────────────────────────
  const garageContent = isOwner ? (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Personal Garage</span>
          <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5 text-sunset" /><strong className="font-semibold text-ink">{ownerBikes.length}</strong> bikes</span>
          <span className="inline-flex items-center gap-1"><Wrench className="h-3.5 w-3.5 text-sunset" /><strong className="font-semibold text-ink">{totalMods}</strong> mods</span>
          <span className="inline-flex items-center gap-1"><Receipt className="h-3.5 w-3.5 text-sunset" /><strong className="font-semibold text-ink">{totalServices}</strong> services</span>
          <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-sunset" /><strong className="font-semibold text-ink">{formatCurrency(totalSpend)}</strong> invested</span>
        </div>
        <CreateBikeDialog />
      </div>

      {ownerBikes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
          <Bike className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm text-muted">No bikes in your garage yet.</p>
          <p className="mt-1 text-xs text-muted">Click &quot;Add Bike&quot; above to add your first machine.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ownerBikes.map((bike) => (
            <BikeCard key={bike.id} bike={bike} isPrimary={bike.id === rider.primaryBikeId} />
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-5">
      {rider.bikes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
          <Bike className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm text-muted">{rider.name} hasn&apos;t added any bikes yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rider.bikes.map((bike) => (
            <PublicBikeCard key={bike.id} bike={bike} isPrimary={bike.id === rider.primaryBikeId} />
          ))}
        </div>
      )}
    </div>
  );

  // ─── Journal tab (Instagram-style grid) ─────────────────────────
  // ─── Gear tab ───────────────────────────────────────────────────
  // Same layout for everyone; only the owner gets the CRUD controls.
  const gearContent = (
    <GearTabbedView
      sections={ownerGearSections}
      items={rider.gearItems}
      createAction={isOwner ? createGearItemAction : undefined}
      updateAction={isOwner ? updateGearItemAction : undefined}
      deleteAction={isOwner ? deleteGearItemAction : undefined}
      emptyMessage={isOwner ? "No gear logged yet." : `${rider.name} hasn't added any gear yet.`}
    />
  );

  // ─── Videos tab ─────────────────────────────────────────────────
  const videosContent = (
    <div className="space-y-5">
      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Your Videos</p>
          <CreateVideoDialog />
        </div>
      )}
      {rider.videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
          <Video className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm text-muted">
            {isOwner ? "No videos yet. Paste a YouTube or TikTok URL above." : `${rider.name} hasn't added any videos yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rider.videos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              <RiderVideoEmbed url={video.url} platform={video.platform} />
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{video.title || video.url}</p>
                  <p className="text-xs text-muted">{video.platform} · {video.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                {isOwner && (
                  <form action={deleteVideoAction.bind(null, video.id)}>
                    <button type="submit" className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50" title="Delete video">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Skills tab ─────────────────────────────────────────────────
  const skillsContent = (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {isOwner
          ? "Set your own level as you learn. A ride organizer can verify it — mentor level is theirs to award."
          : `Where ${rider.name} is on the skills that make group riding safe.`}
      </p>

      {skillTracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
          <p className="text-sm text-muted">No skill tracks are set up yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {skillTracks.map((track) => {
            const mine = track.riderSkills[0];
            return (
              <SkillTrackCard
                key={track.id}
                slug={track.slug}
                name={track.name}
                description={track.description}
                icon={track.icon}
                level={mine?.level ?? null}
                verified={Boolean(mine?.verifiedAt)}
                editable={isOwner}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Photos tab ─────────────────────────────────────────────────
  const photosContent =
    profilePhotos.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
        <ImageIcon className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">
          {isOwner
            ? "No photos yet. Add bike photos or journal images and they'll gather here."
            : `${rider.name} hasn't shared any photos yet.`}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {profilePhotos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-canvas"
          >
            <img
              src={mediaUrl(photo.url)}
              alt={photo.caption ?? ""}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-asphalt/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <p className="truncate text-xs text-white">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );

  // ─── Events tab ─────────────────────────────────────────────────
  const eventsContent =
    profileEvents.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">
          {isOwner ? "No rides yet. Host one or RSVP and it'll show here." : `${rider.name} hasn't joined any rides yet.`}
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {profileEvents.map((ev) => {
          const hosting = ev.hostId === rider.id;
          // Format the date chip in the event's own timezone, not the server's.
          const chip = eventDayMonth(ev.startsAt, ev.timezone ?? DEFAULT_TIMEZONE);
          const meta = [
            ev.meetLocation,
            ev.distanceMiles ? `${ev.distanceMiles} mi` : null,
            ev.difficulty ? ev.difficulty.replace(/_/g, " ").toLowerCase() : null,
          ].filter(Boolean);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft transition hover:border-sunset/40"
            >
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-canvas">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-sunset">{chip.month}</span>
                <span className="font-display text-lg leading-none text-ink">{chip.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-ink">{ev.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                      hosting ? "bg-sunset/10 text-sunset" : "bg-forest/10 text-forest"
                    }`}
                  >
                    {hosting ? "Hosting" : "Going"}
                  </span>
                </div>
                {meta.length > 0 && <p className="mt-0.5 truncate text-xs capitalize text-muted">{meta.join(" · ")}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    );

  // Consolidated tabs: Gear folds into Garage, Photos + Videos into Media, and
  // Skills into Overview — same content, far fewer top-level tabs.
  const sectionHeader = (title: string) => (
    <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">{title}</h3>
  );
  const overviewMerged = (
    <div className="space-y-6">
      {overviewContent}
      <div className="space-y-4">
        {sectionHeader("Riding Skills")}
        {skillsContent}
      </div>
    </div>
  );
  // Service sub-tab: the owner's service history across all their bikes.
  const serviceContent =
    isOwner && totalServices > 0 ? (
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {ownerBikes
          .flatMap((b) =>
            b.serviceRecords.map((r) => ({
              ...r,
              bikeName: b.name || [b.make, b.model].filter(Boolean).join(" ") || "Bike",
            })),
          )
          .sort((a, z) => z.servicedAt.getTime() - a.servicedAt.getTime())
          .map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <span className="font-medium text-ink">{r.title}</span>
                <span className="block text-xs text-muted">
                  {r.bikeName}
                  {r.mileage != null ? ` · ${r.mileage.toLocaleString()} mi` : ""}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {r.servicedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          ))}
      </div>
    ) : undefined;

  const garageMerged = <GarageTabs bikes={garageContent} gear={gearContent} service={serviceContent} />;
  const mediaMerged = (
    <div className="space-y-6">
      <div className="space-y-4">
        {sectionHeader("Photos")}
        {photosContent}
      </div>
      <div className="space-y-4">
        {sectionHeader("Videos")}
        {videosContent}
      </div>
    </div>
  );

  // Exactly the mock's 5 tabs. Owner-only Emergency + Invite live in Settings.
  const tabs: ProfileTab[] = [
    { id: "overview", label: "Overview", content: overviewMerged },
    { id: "journal", label: "Journal", count: rider.journalEntries.length, content: journalContent },
    { id: "garage", label: "Garage", count: rider.bikes.length, content: garageMerged },
    { id: "events", label: "Events", count: profileEvents.length, content: eventsContent },
    { id: "media", label: "Media", count: profilePhotos.length + rider.videos.length, content: mediaMerged },
  ];

  return (
    <AppShell>
      <div>
        {/* PROFILE HEADER — cover with the avatar straddling its lower edge,
            identity on the left, actions on the right, then the tab row. */}
        <div className="overflow-hidden rounded-t-2xl border border-b-0 border-border bg-surface shadow-soft">
          <CoverPhoto
            url={cover || null}
            name={rider.name}
            position={rider.coverPosition}
            canReposition={isOwner}
          />

          {/* Avatar is absolutely positioned so it reliably straddles the cover's
              lower edge; a negative margin on a flex child doesn't lift it out. */}
          <div className="relative px-5 pb-5 sm:px-8">
            <div className="absolute -top-12 left-5 sm:-top-16 sm:left-8">
              {avatar ? (
                <img
                  src={avatar}
                  alt={rider.name}
                  className="h-24 w-24 rounded-full border-4 border-surface object-cover shadow-lift sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-sunset/10 font-display text-4xl font-bold text-sunset shadow-lift sm:h-32 sm:w-32">
                  {rider.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Clears the avatar: stacked under it on mobile, beside it from sm up. */}
            <div className="flex flex-wrap items-start justify-between gap-4 pt-14 sm:pl-36 sm:pt-4">
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-3xl">
                  {rider.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <span>@{rider.handle}</span>
                  {rider.location && (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>·</span>
                      <MapPin className="h-3 w-3 text-sunset" />
                      {rider.location}
                    </span>
                  )}
                  {rider.trust ? (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>·</span>
                      <span className="font-medium text-forest">
                        {rider.trust.level.charAt(0) + rider.trust.level.slice(1).toLowerCase()} rider
                      </span>
                    </span>
                  ) : null}
                  {rider.isAmbassador ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sunset/10 px-2.5 py-0.5 text-xs font-semibold text-sunset">
                      <Award className="h-3.5 w-3.5" /> Ambassador
                    </span>
                  ) : null}
                </div>
                {socialAccounts.length > 0 ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    {socialAccounts.map((social) => (
                      <SocialIconLink key={social.label} {...social} riderName={rider.name} />
                    ))}
                  </div>
                ) : null}
              </div>

              {isOwner && profileData ? (
                <ProfileEditButton profile={profileData} />
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <form action={toggleRiderFollowAction.bind(null, rider.handle)}>
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition ${
                        isFollowing
                          ? "border border-border bg-canvas text-ink hover:border-ink/30"
                          : "bg-sunset text-white shadow-soft hover:bg-[#cf5a26]"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow Rider"}
                    </button>
                  </form>
                  {canMessage ? (
                    <form action={startConversationAction.bind(null, rider.handle)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-canvas px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
                      >
                        <MessageSquare className="h-4 w-4" /> Message
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>

            {rider.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{rider.bio}</p>}

            {/* Admin moderation controls — de-emphasized, admin-only. */}
            {isAdmin ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Admin</span>
                <AmbassadorToggle handle={rider.handle} isAmbassador={rider.isAmbassador} />
                <SpotlightButton handle={rider.handle} />
              </div>
            ) : null}
          </div>

        </div>

        {/* The tab rail is styled as the header card's bottom edge (hence the
            card above is only rounded at the top), with panel content below it. */}
        <ProfileTabs tabs={tabs} />
      </div>
    </AppShell>
  );
}
