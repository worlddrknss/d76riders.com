import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, BookText, CalendarDays, Camera, DollarSign, ExternalLink, Footprints, HardHat, Image as ImageIcon, MapPin, Package, Receipt, Route, Shirt, Trash2, UserPlus, Users, Video, Wrench } from "lucide-react";

import { JournalComposerBar } from "@/components/profile/journal-composer-bar";
import { JournalGrid } from "@/components/profile/journal-grid";
import { SiInstagram, SiInstagramHex, SiTiktok, SiTiktokHex, SiX, SiXHex, SiYoutube, SiYoutubeHex } from "@icons-pack/react-simple-icons";

import { CoverPhoto } from "@/components/profile/cover-photo";
import { SocialIconLink } from "@/components/profile/social-icon-link";
import { ProfileEditButton } from "@/components/profile/profile-edit-button";
import { InviteLink } from "@/components/community/invite-link";
import { InviteChart } from "@/components/profile/invite-chart";
import { OnboardingQuests } from "@/components/community/onboarding-quests";
import { ActivityFeed } from "@/components/profile/activity-feed";
import { ProfileTabs, type ProfileTab } from "@/components/profile/profile-tabs";
import { ReputationPanel } from "@/components/reputation/reputation-panel";
import { SkillTrackCard } from "@/components/reputation/skill-track-card";
import { TrustBadge } from "@/components/reputation/trust-badge";
import { evaluateQuests } from "@/lib/quests";
import { getOrCreateReferralCode, referralStats } from "@/lib/referrals";
import { EmergencyCardManager, type EmergencyCardData } from "@/components/profile/emergency-card-manager";
import { PublicBikeCard } from "@/components/garage/public-bike-card";
import { BikeCard } from "@/components/garage/bike-card";
import { CreateBikeDialog } from "@/components/garage/create-bike-dialog";
import { GearTabbedView } from "@/components/gear/gear-tabbed-view";
import { VideoEmbed as RiderVideoEmbed } from "@/components/videos/video-embed";
import { decryptEmergencyPayload, isEmergencyCryptoConfigured } from "@/lib/emergency-crypto";
import { toggleRiderFollowAction } from "@/app/(site)/garage/mine/actions";
import { createGearItemAction, updateGearItemAction, deleteGearItemAction } from "@/app/(site)/gear/mine/actions";
import { deleteVideoAction } from "@/app/(site)/videos/mine/actions";
import { CreateVideoDialog } from "@/components/videos/create-video-dialog";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

const gearSections = [
  { key: "HELMET", label: "Helmets", icon: HardHat },
  { key: "GLOVES", label: "Gloves", icon: Package },
  { key: "JACKET", label: "Jackets", icon: Shirt },
  { key: "PANTS", label: "Riding Pants", icon: Shirt },
  { key: "BOOTS", label: "Boots", icon: Footprints },
  { key: "CAMERA_GEAR", label: "Camera Gear", icon: Camera },
  { key: "ACCESSORY", label: "Accessories", icon: Package },
] as const;

// Owner gear editor sections (icon resolved by key inside GearTabbedView).
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
        orderBy: [{ category: "asc" }, { purchaseDate: "desc" }, { createdAt: "desc" }],
      },
      trust: true,
      badges: {
        orderBy: { awardedAt: "desc" },
        select: {
          id: true,
          badge: { select: { name: true, icon: true, tier: true, description: true } },
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

  const [hostedEvents, rsvpEvents, recentActivities, profilePhotos, profileEvents] = await Promise.all([
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
      take: 8,
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
        meetLocation: true,
        distanceMiles: true,
        difficulty: true,
        hostId: true,
      },
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
    timezone: rider.timezone,
    favoriteRoad: rider.favoriteRoad || "",
    yearStartedRiding: rider.yearsRiding != null ? Math.max(1900, new Date().getFullYear() - rider.yearsRiding) : null,
    youtubeHandle: rider.youtubeUrl?.replace(/^https:\/\/youtube\.com\/@?/, "") || "",
    tiktokHandle: rider.tiktokUrl?.replace(/^https:\/\/tiktok\.com\/@?/, "") || "",
    instagramHandle: rider.instagramUrl?.replace(/^https:\/\/instagram\.com\//, "") || "",
    twitterHandle: rider.twitterUrl?.replace(/^https:\/\/x\.com\//, "") || "",
  } : null;

  // Emergency card (owner-only) — decrypt the medical payload for editing.
  const emergencyConfigured = isEmergencyCryptoConfigured();
  let emergencyCard: EmergencyCardData | null = null;
  if (isOwner) {
    const cardRow = await prisma.emergencyCard.findUnique({ where: { riderId: rider.id } });
    if (cardRow && emergencyConfigured) {
      try {
        emergencyCard = {
          token: cardRow.token,
          active: cardRow.active,
          showBloodType: cardRow.showBloodType,
          showAllergies: cardRow.showAllergies,
          showConditions: cardRow.showConditions,
          showMedications: cardRow.showMedications,
          showInsurance: cardRow.showInsurance,
          payload: decryptEmergencyPayload({
            encryptedData: cardRow.encryptedData,
            dekCiphertext: cardRow.dekCiphertext,
          }),
        };
      } catch {
        emergencyCard = null;
      }
    }
  }

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

  const memberSince = rider.joinedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

  const featuredBike = rider.bikes.find((b) => b.id === rider.primaryBikeId) ?? rider.bikes[0] ?? null;
  const featuredBikePhoto = featuredBike?.photos[0]?.url ? mediaUrl(featuredBike.photos[0].url) : null;
  const hasPeople =
    rider.followers.length > 0 || rider.following.length > 0 || rider.followedEvents.length > 0;

  // ─── Overview tab ───────────────────────────────────────────────
  // Onboarding is the owner's own checklist — never shown to visitors.
  const quests = isOwner ? await evaluateQuests(rider.id) : [];

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

  // Minted on first view of the owner's own Invite tab.
  const referral = isOwner
    ? await (async () => {
        await getOrCreateReferralCode(rider.id);
        return referralStats(rider.id);
      })()
    : null;

  const reputationPanel = (
    <ReputationPanel
      trust={rider.trust}
      badges={rider.badges.map((held) => ({ id: held.id, ...held.badge }))}
      skills={rider.skills.map((held) => ({
        id: held.id,
        name: held.skill.name,
        level: held.level,
        verified: held.verifiedAt !== null,
      }))}
    />
  );

  // ─── Journal feed (rendered as the Overview main column) ────────
  const ridesContent = (
    <div>
      {isOwner && (
        <JournalComposerBar avatarUrl={avatar} firstName={rider.name.split(" ")[0]} />
      )}
      <div className={isOwner ? "mt-6" : ""}>
        {journalForGrid.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <BookText className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">
              {isOwner
                ? "No ride journal entries yet. Use the box above to share your first ride story."
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

  // Who-this-rider-is sidebar. Lives on the Journal tab beside the feed; Overview
  // is just the activity feed.
  const sidebar = (
    <div className="space-y-5">
          {reputationPanel}
          {featuredBike && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              <div className="relative h-44 w-full bg-linear-to-br from-asphalt to-sunset/40">
                {featuredBikePhoto ? (
                  <img src={featuredBikePhoto} alt={featuredBike.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/70">
                    <Bike className="h-12 w-12" />
                  </div>
                )}
                {featuredBike.id === rider.primaryBikeId && (
                  <span className="absolute left-3 top-3 rounded-full bg-sunset px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-soft">
                    Current Ride
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-sunset">Featured Bike</p>
                <h3 className="mt-0.5 font-display text-base font-semibold text-ink">
                  {featuredBike.name || `${featuredBike.make} ${featuredBike.model ?? ""}`.trim()}
                </h3>
                <p className="text-xs text-muted">
                  {[featuredBike.year, featuredBike.make, featuredBike.model].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          )}

          <div className={cardClass}>
            <h2 className={headingClass}>Details</h2>
            <dl className="mt-3 space-y-3">
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
                  <dd className="text-sm font-medium text-asphalt">{memberSince}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Socials moved into the header as icons — see socialAccounts above. */}

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className={headingClass}><CalendarDays className="h-3.5 w-3.5 text-sunset" />Events</h2>
              {isOwner && <Link href="/events/new" className="text-xs font-semibold text-sunset hover:underline">+ New</Link>}
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

          <div className={cardClass}>
            <h2 className={headingClass}><Users className="h-3.5 w-3.5 text-sunset" />People</h2>
            {hasPeople ? (
              <div className="mt-3 space-y-3">
                {rider.followers.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Followers</p>
                    <div className="mt-2 space-y-1.5">
                      {rider.followers.map((entry) => (
                        <Link key={entry.follower.handle} href={`/r/${entry.follower.handle}`} className="block text-sm text-ink hover:text-sunset">
                          {entry.follower.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {rider.following.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Following</p>
                    <div className="mt-2 space-y-1.5">
                      {rider.following.map((entry) => (
                        <Link key={entry.following.handle} href={`/r/${entry.following.handle}`} className="block text-sm text-ink hover:text-sunset">
                          {entry.following.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {rider.followedEvents.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Tracked Events</p>
                    <div className="mt-2 space-y-1.5">
                      {rider.followedEvents.map((entry) => (
                        <Link key={entry.event.slug} href={`/events/${entry.event.slug}`} className="block text-sm text-ink hover:text-sunset">
                          {entry.event.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">
                {isOwner
                  ? "Follow riders and track events to build your network."
                  : `${rider.name} hasn't connected with anyone yet.`}
              </p>
            )}
          </div>
    </div>
  );

  // Overview: identity sidebar beside the activity feed.
  const overviewContent = (
    <div className="space-y-5">
      {isOwner ? <OnboardingQuests quests={quests} /> : null}
      <div className="grid gap-5 lg:grid-cols-[21rem_1fr] xl:grid-cols-[23rem_1fr]">
        {sidebar}
        <div>
          <ActivityFeed
            items={recentActivities}
            viewAllHref={isOwner ? "/notifications" : undefined}
          />
        </div>
      </div>
    </div>
  );

  // Journal: the same identity sidebar beside the rider's journal feed.
  const journalContent = (
    <div className="grid gap-5 lg:grid-cols-[21rem_1fr] xl:grid-cols-[23rem_1fr]">
      {sidebar}
      <div>{ridesContent}</div>
    </div>
  );

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
  const gearContent = isOwner ? (
    <GearTabbedView
      sections={ownerGearSections}
      items={rider.gearItems}
      createAction={createGearItemAction}
      updateAction={updateGearItemAction}
      deleteAction={deleteGearItemAction}
    />
  ) : (
    <div className="space-y-5">
      {rider.gearItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
          <HardHat className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm text-muted">
            {isOwner ? "No gear logged yet." : `${rider.name} hasn't added any gear yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gearSections.map((section) => {
            const items = rider.gearItems.filter((item) => item.category === section.key);
            if (items.length === 0) return null;
            const Icon = section.icon;
            return (
              <article key={section.key} className="flex flex-col rounded-xl border border-border bg-surface shadow-soft">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sunset/10 text-sunset">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{section.label}</p>
                  </div>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-canvas px-1.5 text-xs font-bold text-asphalt">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-4">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-canvas px-3 py-2.5">
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      {(item.brand || item.model) ? (
                        <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(" ")}</p>
                      ) : null}
                      {(item.size || item.color || item.condition) ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {[item.size && `Size ${item.size}`, item.color, item.condition].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {item.notes ? <p className="mt-1 text-xs italic text-muted">{item.notes}</p> : null}
                      {item.purchaseUrl ? (
                        <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
                          <ExternalLink className="h-3 w-3" /> Buy this
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
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

  // ─── Invite tab (owner only) ────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";
  // Laid out like the Overview tab: a narrow left panel of who/what, and the
  // activity as the wide main column. Same grid, same card and heading tokens,
  // so the two tabs read as one page rather than two.
  const inviteContent = referral ? (
    <div className="grid gap-5 lg:grid-cols-[21rem_1fr] xl:grid-cols-[23rem_1fr]">
      <div className="space-y-5">
        <div className={cardClass}>
          <h2 className={headingClass}>
            <UserPlus className="h-4 w-4 text-sunset" />
            Your invite
          </h2>
          <p className="mt-2 text-sm text-muted">
            Share your link. Anyone who joins through it is credited to you.
          </p>
          <div className="mt-4">
            <InviteLink url={`${siteUrl}/i/${referral.code}`} code={referral.code ?? ""} />
          </div>
        </div>

        <div className={cardClass}>
          <h2 className={headingClass}>So far</h2>
          {/* Two numbers, side by side, where they also read as the ratio they
              are: opens, of which joins. */}
          <div className="mt-3 flex items-baseline gap-x-8 gap-y-2">
            <p className="flex flex-col">
              <span className="font-display text-3xl font-bold text-ink">{referral.clicks}</span>
              <span className="text-xs uppercase tracking-[0.08em] text-muted">Link opens</span>
            </p>
            <p className="flex flex-col">
              <span className="font-display text-3xl font-bold text-sunset">{referral.conversions}</span>
              <span className="text-xs uppercase tracking-[0.08em] text-muted">Riders joined</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <InviteChart data={referral.series} />

        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Riders you brought in</h2>
          {referral.referrals.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
              <UserPlus className="mx-auto h-7 w-7 text-muted/50" />
              <p className="mt-2 text-sm text-muted">No one has joined through your link yet.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {referral.referrals.map((entry) => {
                const referred = entry.referredUser.rider;
                if (!referred) return null;
                return (
                  <li key={referred.handle}>
                    <Link
                      href={`/r/${referred.handle}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/40"
                    >
                      {referred.avatarUrl ? (
                         
                        <img
                          src={mediaUrl(referred.avatarUrl)}
                          alt=""
                          className="h-9 w-9 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-canvas text-[0.6rem] font-bold text-muted">
                          {referred.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{referred.name}</span>
                        <span className="block truncate text-xs text-muted">@{referred.handle}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  ) : null;

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
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-sunset">
                  {ev.startsAt.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="font-display text-lg leading-none text-ink">{ev.startsAt.getDate()}</span>
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

  const tabs: ProfileTab[] = [
    { id: "overview", label: "Overview", content: overviewContent },
    { id: "journal", label: "Journal", count: rider.journalEntries.length, content: journalContent },
    { id: "garage", label: "Builds", count: rider.bikes.length, content: garageContent },
    { id: "photos", label: "Photos", count: profilePhotos.length, content: photosContent },
    { id: "events", label: "Events", count: profileEvents.length, content: eventsContent },
    { id: "gear", label: "Gear", count: rider.gearItems.length, content: gearContent },
    { id: "videos", label: "Videos", count: rider.videos.length, content: videosContent },
    {
      id: "skills",
      label: "Skills",
      count: rider.skills.length || null,
      content: skillsContent,
    },
  ];
  if (isOwner) {
    tabs.push({
      id: "emergency",
      label: "Emergency",
      content: (
        <div className="max-w-md">
          <EmergencyCardManager card={emergencyCard} configured={emergencyConfigured} />
        </div>
      ),
    });
    // Referral link and conversions are personal — owner only.
    tabs.push({
      id: "invite",
      label: "Invite",
      count: referral?.conversions || null,
      content: inviteContent,
    });
  }

  return (
    <section className="page-shell">
      <div className="content-wrap">
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
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                  <span>@{rider.handle}</span>
                  {rider.location && (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>·</span>
                      <MapPin className="h-3 w-3 text-sunset" />
                      {rider.location}
                    </span>
                  )}
                </p>
              </div>

              {isOwner && profileData ? (
                <ProfileEditButton profile={profileData} />
              ) : currentUser ? (
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
              ) : null}
            </div>

            {rider.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{rider.bio}</p>}

            {/* Stats as one quiet line rather than four boxes — they're context,
                not the point of the page. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <Link
                href={`/r/${rider.handle}?tab=garage`}
                className="hover:text-sunset"
              >
                <span className="font-semibold text-ink">{rider.bikes.length}</span> bike
                {rider.bikes.length === 1 ? "" : "s"}
              </Link>
              <span>
                <span className="font-semibold text-ink">{ridesFromEvents}</span> ride
                {ridesFromEvents === 1 ? "" : "s"}
              </span>
              {rider.yearsRiding ? (
                <span>
                  <span className="font-semibold text-ink">{rider.yearsRiding}</span> year
                  {rider.yearsRiding === 1 ? "" : "s"} riding
                </span>
              ) : null}
              {rider.trust && rider.trust.eventsAttended > 0 ? (
                <TrustBadge level={rider.trust.level} score={rider.trust.score} />
              ) : null}

              {/* Socials as icons in the header rather than a sidebar card —
                  they're a handful of links, not a section. */}
              {socialAccounts.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  {socialAccounts.map((social) => (
                    <SocialIconLink key={social.label} {...social} riderName={rider.name} />
                  ))}
                </span>
              ) : null}
            </div>
          </div>

        </div>

        {/* The tab rail is styled as the header card's bottom edge (hence the
            card above is only rounded at the top), with panel content below it. */}
        <ProfileTabs tabs={tabs} />
      </div>
    </section>
  );
}
