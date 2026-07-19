import Link from "next/link";
import { OG_IMAGE } from "@/lib/og";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flag, Trophy } from "lucide-react";

import { ChallengeJoinButton } from "@/components/challenges/challenge-join-button";
import { RetireChallengeButton } from "@/components/challenges/retire-challenge-button";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ShareMenu } from "@/components/ui/share-menu";
import { challengeStatus, daysLeft, formatProgress, METRIC_LABEL } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!challenge) return { title: "Challenge Not Found" };

  return {
    title: challenge.name,
    description: challenge.description,
    alternates: { canonical: `/challenges/${slug}` },
    openGraph: {
    images: OG_IMAGE, title: challenge.name, description: challenge.description },
  };
}

const RANK_STYLES = ["text-sunset", "text-muted", "text-muted"];

export default async function ChallengeDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: {
      crew: { select: { name: true, slug: true } },
      badge: { select: { name: true } },
      createdBy: { select: { handle: true, name: true } },
      entries: {
        // Furthest along first; ties broken by who committed earliest.
        orderBy: [{ progress: "desc" }, { joinedAt: "asc" }],
        take: 100,
        include: {
          rider: { select: { handle: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!challenge || !challenge.active) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const now = new Date();
  const status = challengeStatus(challenge, now);
  const mine = rider ? challenge.entries.find((entry) => entry.riderId === rider.id) : undefined;
  const finishers = challenge.entries.filter((entry) => entry.completedAt !== null).length;

  const window = `${challenge.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${challenge.endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <AppShell>
      <PageHeader icon={Flag} title={challenge.name} subtitle={challenge.description ?? undefined} />

      <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/challenges" className="text-xs font-semibold text-muted hover:text-ink">
              ← All challenges
            </Link>
            <div className="flex items-center gap-3">
              <ShareMenu
                path={`/challenges/${challenge.slug}`}
                title={challenge.name}
                text={`${challenge.name} — join the D76 Riders challenge!`}
              />
              {rider ? (
                <>
                  {challenge.createdByRiderId === rider.id ? (
                    <RetireChallengeButton slug={challenge.slug} />
                  ) : null}
                  <ChallengeJoinButton slug={challenge.slug} joined={Boolean(mine)} ended={status === "ENDED"} />
                </>
              ) : (
                <Link href={`/login?next=/challenges/${challenge.slug}`} className="text-xs font-semibold text-sunset">
                  Log in to join
                </Link>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Goal</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {challenge.goal.toLocaleString()}
              </p>
              <p className="text-xs text-muted">{METRIC_LABEL[challenge.metric]}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Window</p>
              <p className="mt-1 text-sm font-semibold text-ink">{window}</p>
              <p className="text-xs text-muted">
                {status === "ACTIVE"
                  ? `${daysLeft(challenge.endsAt, now)} days left`
                  : status === "UPCOMING"
                    ? "Not started"
                    : "Finished"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Riders in</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{challenge.entries.length}</p>
              <p className="text-xs text-muted">{finishers} finished</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Your progress</p>
              {mine ? (
                <>
                  <p className="mt-1 font-display text-2xl font-bold text-sunset">
                    {mine.progress.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">
                    {mine.completedAt ? "Complete" : `${challenge.goal - mine.progress} to go`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">Not joined</p>
              )}
            </div>
          </div>

          {challenge.createdBy ? (
            <p className="text-xs text-muted">
              Set by{" "}
              <Link href={`/r/${challenge.createdBy.handle}`} className="font-semibold text-ink hover:text-sunset">
                {challenge.createdBy.name}
              </Link>
            </p>
          ) : null}

          {challenge.badge ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-soft">
              Finish this and you earn the <span className="font-semibold text-ink">{challenge.badge.name}</span>{" "}
              badge.
            </p>
          ) : null}

          {/* Standings */}
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Standings</h2>
            {challenge.entries.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
                <Trophy className="mx-auto h-8 w-8 text-muted/50" />
                <p className="mt-3 text-sm text-muted">
                  Nobody has joined yet. {status !== "ENDED" ? "Be first." : ""}
                </p>
              </div>
            ) : (
              <ol className="mt-3 space-y-2">
                {challenge.entries.map((entry, index) => {
                  const pct = Math.min(100, Math.round((entry.progress / challenge.goal) * 100));
                  const isMe = rider?.id === entry.riderId;

                  return (
                    <li key={entry.id}>
                      <Link
                        href={`/r/${entry.rider.handle}`}
                        className={`flex items-center gap-4 rounded-xl border bg-surface p-4 shadow-soft transition hover:border-sunset/40 ${
                          isMe ? "border-sunset/50" : "border-border"
                        }`}
                      >
                        <span
                          className={`w-6 shrink-0 text-center font-display text-lg font-bold ${
                            RANK_STYLES[index] ?? "text-muted"
                          }`}
                        >
                          {index + 1}
                        </span>

                        {entry.rider.avatarUrl ? (
                           
                          <img
                            src={mediaUrl(entry.rider.avatarUrl)}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-canvas text-[0.65rem] font-bold text-muted">
                            {entry.rider.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold text-ink">{entry.rider.name}</span>
                            {entry.completedAt ? (
                              <span className="rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-forest">
                                Finished
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full ${entry.completedAt ? "bg-forest" : "bg-sunset"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {formatProgress(entry.progress, challenge.goal, challenge.metric)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
      </div>
    </AppShell>
  );
}
