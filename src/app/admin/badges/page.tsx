import { Award } from "lucide-react";

import { awardBadgeAction, createBadgeAction, recomputeAllTrustAction } from "@/app/admin/badges/actions";
import { BadgeDeleteButton } from "@/components/admin/badge-delete-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "A badge name is required.",
  slug: "A badge with that slug already exists.",
  award: "Couldn't find that rider or badge.",
  duplicate: "That rider already holds the badge.",
};

const CRITERIA_HELP: Record<string, string> = {
  EVENTS_ATTENDED: "rides checked into",
  MILES_RIDDEN: "miles ridden",
  EVENTS_ORGANIZED: "rides organized",
  MENTOR: "skills verified at mentor level",
  SAFETY_ACKNOWLEDGED: "current safety waiver accepted",
  MANUAL: "awarded by hand",
};

export default async function AdminBadgesPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const [badges, trustCount] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ criteria: "asc" }, { threshold: "asc" }],
      include: { _count: { select: { riderBadges: true } } },
    }),
    prisma.riderTrust.count(),
  ]);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Progression</p>
        <h1 className="mt-2 font-display text-4xl text-white">Badges</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Badge definitions drive automatic awards. Riders earn them on check-in and when a ride closes — no
          badge is ever revoked once earned.
        </p>
        <form action={recomputeAllTrustAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30"
          >
            Recompute trust for all riders ({trustCount} snapshot{trustCount === 1 ? "" : "s"})
          </button>
        </form>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createBadgeAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg text-white">New badge</h2>

          <input
            name="name"
            required
            placeholder="Badge name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <input
            name="description"
            placeholder="Description"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="criteria"
              defaultValue="EVENTS_ATTENDED"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {Object.keys(CRITERIA_HELP).map((key) => (
                <option key={key} value={key}>
                  {key.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <input
              name="threshold"
              type="number"
              min={1}
              defaultValue={1}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="tier"
              defaultValue="BRONZE"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
            <input
              name="icon"
              placeholder="lucide icon (e.g. flag)"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25"
          >
            Create Badge
          </button>
        </form>

        <form
          action={awardBadgeAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg text-white">Award by hand</h2>
          <p className="text-xs text-slate-400">
            The only way to grant a manual badge, and a way to give an automatic one early.
          </p>

          <select
            name="badgeId"
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {badges.map((badge) => (
              <option key={badge.id} value={badge.id}>
                {badge.name}
              </option>
            ))}
          </select>
          <input
            name="handle"
            required
            placeholder="Rider handle (e.g. ace)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30"
          >
            Award Badge
          </button>
        </form>
      </section>

      {badges.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 p-12 text-center shadow-lg">
          <Award className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">
            No badges defined. Run <code className="font-mono text-slate-300">npm run db:seed</code> to load the
            defaults.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {badges.map((badge) => (
            <article
              key={badge.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 p-4 shadow-lg"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{badge.name}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-300">
                    {badge.tier}
                  </span>
                  <span className="text-xs text-slate-500">
                    {badge.criteria === "MANUAL" || badge.criteria === "SAFETY_ACKNOWLEDGED"
                      ? CRITERIA_HELP[badge.criteria]
                      : `${badge.threshold} ${CRITERIA_HELP[badge.criteria]}`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{badge.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">
                  {badge._count.riderBadges} holder{badge._count.riderBadges === 1 ? "" : "s"}
                </span>
                <BadgeDeleteButton badgeId={badge.id} name={badge.name} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
