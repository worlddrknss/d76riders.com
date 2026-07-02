import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, BookText, CalendarDays, MapPin, Route } from "lucide-react";

import { CreateJournalDialog } from "@/components/profile/create-journal-dialog";
import { JournalList } from "@/components/profile/journal-list";
import { ReportJournalButton } from "@/components/profile/report-journal-button";
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
      userId: true,
      handle: true,
      name: true,
      bio: true,
      location: true,
      avatarUrl: true,
      coverUrl: true,
      yearsRiding: true,
      ridesCompleted: true,
      favoriteRoad: true,
      joinedAt: true,
      bikes: {
        select: { id: true, name: true, make: true, model: true },
        take: 5,
      },
      journalEntries: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          galleryItems: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { url: true, caption: true },
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
    },
  });

  if (!rider) {
    notFound();
  }

  const isOwner = currentUser?.id === rider.userId;
  const avatar = mediaUrl(rider.avatarUrl);
  const cover = mediaUrl(rider.coverUrl);

  return (
    <section className="page-shell">
      <div className="content-wrap">
        {cover && (
          <div className="mb-6 h-40 w-full overflow-hidden rounded-xl sm:h-52">
            <img src={cover} alt={`${rider.name}'s cover`} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
          {/* SIDEBAR */}
          <aside className="space-y-5">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              {avatar ? (
                <img src={avatar} alt={rider.name} className="mx-auto h-20 w-20 rounded-full border-2 border-sunset/30 object-cover" />
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sunset/10 font-display text-2xl font-bold text-sunset">
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
                <div className="rounded-lg bg-canvas p-3 text-center">
                  <p className="font-display text-xl font-bold text-asphalt">{rider.bikes.length}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Bikes</p>
                </div>
                <div className="rounded-lg bg-canvas p-3 text-center">
                  <p className="font-display text-xl font-bold text-asphalt">{rider.ridesCompleted}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Rides</p>
                </div>
                <div className="rounded-lg bg-canvas p-3 text-center">
                  <p className="font-display text-xl font-bold text-asphalt">{rider.yearsRiding ?? "—"}</p>
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted">Years</p>
                </div>
              </div>

              {isOwner && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/account" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-asphalt transition hover:border-asphalt">
                    Edit Profile
                  </Link>
                  <Link href="/garage/mine" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-asphalt transition hover:border-asphalt">
                    <Bike className="mr-1 inline h-3.5 w-3.5" />Garage
                  </Link>
                </div>
              )}

              {/* Details */}
              <dl className="mt-5 space-y-3 border-t border-border pt-4 text-left">
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
                      <dt className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Rides</dt>
                      <dd className="text-sm font-medium text-asphalt">
                        {rider.bikes.map((b) => b.name || `${b.make} ${b.model ?? ""}`.trim()).join(", ")}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

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
          </aside>

          {/* MAIN — Ride Journal */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-asphalt">
                <BookText className="h-5 w-5 text-sunset" />
                Ride Journal
              </h2>
              {isOwner && <CreateJournalDialog />}
            </div>

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
                <JournalList entries={rider.journalEntries} />
              ) : (
                rider.journalEntries.map((entry) => {
                  const entryImage = entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null;
                  return (
                    <article key={entry.id} className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                      {currentUser && (
                        <div className="absolute right-3 top-3 z-10">
                          <ReportJournalButton entryId={entry.id} />
                        </div>
                      )}
                      {entryImage && (
                        <div className="aspect-video w-full overflow-hidden">
                          <img src={entryImage} alt={entry.galleryItems[0]?.caption || entry.title || "Ride"} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-sunset">
                          {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {entry.title && <h3 className="mt-1 font-display text-lg font-semibold text-ink">{entry.title}</h3>}
                        <p className="mt-2 leading-relaxed text-muted">{entry.body}</p>
                      </div>
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
