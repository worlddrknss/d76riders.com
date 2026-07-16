import Link from "next/link";

import { createChallengeAction } from "@/app/admin/community/actions";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { CommunityDeleteButton } from "@/components/admin/community-delete-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  challenge: "A challenge needs a name and a positive goal.",
  challengeSlug: "A challenge with that slug already exists.",
  challengeWindow: "The end date must be after the start date.",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const submitClass =
  "w-full rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25";
const labelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-400";

export default async function AdminChallengesPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const [challenges, crews, badges] = await Promise.all([
    prisma.challenge.findMany({
      orderBy: [{ active: "desc" }, { endsAt: "desc" }],
      include: {
        crew: { select: { name: true } },
        createdBy: { select: { handle: true } },
        _count: { select: { entries: true } },
      },
    }),
    prisma.crew.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.badge.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Challenges"
        description="Riders set their own challenges from /challenges. This is where you keep them in line with the guidelines — edit what needs correcting, deactivate what doesn't belong, and delete only what should never have existed."
      />

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createChallengeAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg font-semibold text-white">New challenge</h2>
          <p className="text-xs text-slate-400">
            Riders can set their own — use this for official ones. Only rides inside the window count toward it.
          </p>

          <input name="name" required placeholder="Name (e.g. 500 Miles in July)" className={inputClass} />
          <input name="description" placeholder="What it takes" className={inputClass} />

          <div className="grid gap-3 sm:grid-cols-2">
            <select name="metric" defaultValue="MILES_RIDDEN" className={inputClass}>
              <option value="MILES_RIDDEN">Miles ridden</option>
              <option value="EVENTS_ATTENDED">Rides attended</option>
              <option value="EVENTS_ORGANIZED">Rides organized</option>
            </select>
            <input name="goal" type="number" min={1} required placeholder="Goal (e.g. 500)" className={inputClass} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Starts
              <input name="startsAt" type="datetime-local" required className={`mt-1 ${inputClass}`} />
            </label>
            <label className={labelClass}>
              Ends
              <input name="endsAt" type="datetime-local" required className={`mt-1 ${inputClass}`} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select name="crewId" defaultValue="" className={inputClass}>
              <option value="">Open to everyone</option>
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name} crew only
                </option>
              ))}
            </select>
            <select name="badgeId" defaultValue="" className={inputClass}>
              <option value="">No badge</option>
              {badges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  Award: {badge.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={submitClass}>
            Create Challenge
          </button>
        </form>

        <div className="space-y-2">
          {challenges.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/3 p-5 text-sm text-slate-400 shadow-lg">
              No challenges yet.
            </p>
          ) : (
            challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 p-4 shadow-lg"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/challenges/${challenge.slug}`}
                      className="font-semibold text-white hover:text-sunset"
                    >
                      {challenge.name}
                    </Link>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">
                      {challenge.goal} {challenge.metric.replaceAll("_", " ").toLowerCase()}
                    </span>
                    {!challenge.active ? (
                      <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-red-200">
                        Deactivated
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {challenge.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                    {challenge.endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {challenge._count.entries} rider{challenge._count.entries === 1 ? "" : "s"} in
                    {challenge.crew ? ` · ${challenge.crew.name} crew` : ""}
                    {challenge.createdBy ? ` · set by @${challenge.createdBy.handle}` : " · set here"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/community/challenges/${challenge.id}/edit`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                  >
                    Edit
                  </Link>
                  <CommunityDeleteButton kind="challenge" id={challenge.id} name={challenge.name} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
