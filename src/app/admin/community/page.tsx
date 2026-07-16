import Link from "next/link";

import {
  createCrewAction,
  createSponsorAction,
  linkSponsorToEventAction,
  setCrewMemberAction,
} from "@/app/admin/community/actions";
import { CommunityDeleteButton } from "@/components/admin/community-delete-button";
import { FeatureEventToggle } from "@/components/admin/feature-event-toggle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  crew: "A crew name is required.",
  crewSlug: "A crew with that slug already exists.",
  member: "Couldn't find that crew or rider.",
  sponsor: "A sponsor name is required.",
  sponsorSlug: "A sponsor with that slug already exists.",
  sponsorUrl: "The website must be a valid http(s) URL.",
  link: "Couldn't find that sponsor or event.",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const submitClass =
  "w-full rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25";

export default async function AdminCommunityPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const now = new Date();
  const [crews, sponsors, events, referralLeaders] = await Promise.all([
    prisma.crew.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true, events: true } } },
    }),
    prisma.sponsor.findMany({
      orderBy: [{ tier: "asc" }, { name: "asc" }],
      include: { _count: { select: { events: true } } },
    }),
    prisma.rideEvent.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 20,
      select: { id: true, title: true, slug: true, startsAt: true, featured: true },
    }),
    prisma.referralCode.findMany({
      orderBy: { referrals: { _count: "desc" } },
      take: 10,
      select: {
        code: true,
        clicks: true,
        rider: { select: { handle: true, name: true } },
        _count: { select: { referrals: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Growth</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Community</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Crews, local business sponsors, featured rides, and referral performance.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      {/* ── Featured rides ── */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Featured rides</h2>
        <p className="mt-1 text-xs text-slate-400">
          Featured rides appear as public highlights on the homepage.
        </p>

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No upcoming rides.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 p-3"
              >
                <div className="min-w-0">
                  <Link href={`/events/${event.slug}`} className="font-semibold text-white hover:text-sunset">
                    {event.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {event.startsAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <FeatureEventToggle eventId={event.id} featured={event.featured} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Crews ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <form action={createCrewAction} className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg font-semibold text-white">New crew</h2>
          <input name="name" required placeholder="Crew name (e.g. Sportbike)" className={inputClass} />
          <input name="description" placeholder="What this crew is about" className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="open" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Open to join (uncheck for invite-only)
          </label>
          <button type="submit" className={submitClass}>
            Create Crew
          </button>
        </form>

        <form action={setCrewMemberAction} className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg font-semibold text-white">Add / promote member</h2>
          <select name="crewId" required className={inputClass}>
            {crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
          <input name="handle" required placeholder="Rider handle" className={inputClass} />
          <select name="role" defaultValue="MEMBER" className={inputClass}>
            <option value="MEMBER">Member</option>
            <option value="LEAD">Lead</option>
          </select>
          <button type="submit" className={submitClass}>
            Set Membership
          </button>
        </form>
      </section>

      {crews.length > 0 ? (
        <div className="space-y-2">
          {crews.map((crew) => (
            <article
              key={crew.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 p-4 shadow-lg"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/crews/${crew.slug}`} className="font-semibold text-white hover:text-sunset">
                    {crew.name}
                  </Link>
                  {!crew.open ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">
                      Invite only
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  {crew._count.members} member{crew._count.members === 1 ? "" : "s"} · {crew._count.events} ride
                  {crew._count.events === 1 ? "" : "s"}
                </p>
              </div>
              <CommunityDeleteButton kind="crew" id={crew.id} name={crew.name} />
            </article>
          ))}
        </div>
      ) : null}

      {/* ── Sponsors ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createSponsorAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg font-semibold text-white">New sponsor</h2>
          <input name="name" required placeholder="Business name" className={inputClass} />
          <input name="description" placeholder="What they do" className={inputClass} />
          <input name="websiteUrl" type="url" placeholder="https://example.com" className={inputClass} />
          <input name="logoUrl" type="url" placeholder="Logo URL (https://…)" className={inputClass} />
          <select name="tier" defaultValue="SUPPORTER" className={inputClass}>
            <option value="PARTNER">Partner</option>
            <option value="SUPPORTER">Supporter</option>
            <option value="FRIEND">Friend of the Community</option>
          </select>
          <button type="submit" className={submitClass}>
            Add Sponsor
          </button>
        </form>

        <form
          action={linkSponsorToEventAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg font-semibold text-white">Sponsor a ride</h2>
          <p className="text-xs text-slate-400">Attach a sponsor to a specific event.</p>
          <select name="sponsorId" required className={inputClass}>
            {sponsors.map((sponsor) => (
              <option key={sponsor.id} value={sponsor.id}>
                {sponsor.name}
              </option>
            ))}
          </select>
          <input name="eventSlug" required placeholder="Event slug" className={inputClass} />
          <button type="submit" className={submitClass}>
            Link Sponsor
          </button>
        </form>
      </section>

      {sponsors.length > 0 ? (
        <div className="space-y-2">
          {sponsors.map((sponsor) => (
            <article
              key={sponsor.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 p-4 shadow-lg"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{sponsor.name}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">
                    {sponsor.tier}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {sponsor._count.events} sponsored ride{sponsor._count.events === 1 ? "" : "s"}
                </p>
              </div>
              <CommunityDeleteButton kind="sponsor" id={sponsor.id} name={sponsor.name} />
            </article>
          ))}
        </div>
      ) : null}

      {/* ── Referrals ── */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Top referrers</h2>
        {referralLeaders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No invite links have been created yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-semibold">Rider</th>
                <th className="pb-2 font-semibold">Code</th>
                <th className="pb-2 text-right font-semibold">Opens</th>
                <th className="pb-2 text-right font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {referralLeaders.map((leader) => (
                <tr key={leader.code} className="border-t border-white/5">
                  <td className="py-2">
                    <Link href={`/r/${leader.rider.handle}`} className="text-slate-200 hover:text-white">
                      @{leader.rider.handle}
                    </Link>
                  </td>
                  <td className="py-2 font-mono text-xs text-slate-400">{leader.code}</td>
                  <td className="py-2 text-right text-slate-400">{leader.clicks}</td>
                  <td className="py-2 text-right font-semibold text-sunset">{leader._count.referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
