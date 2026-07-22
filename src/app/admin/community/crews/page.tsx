import Link from "next/link";

import { createCrewAction, setCrewMemberAction } from "@/app/admin/community/actions";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { CommunityDeleteButton } from "@/components/admin/community-delete-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  crew: "A sub-community name is required.",
  crewSlug: "A sub-community with that slug already exists.",
  member: "Couldn't find that sub-community or rider.",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const submitClass =
  "w-full rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25";

export default async function AdminCrewsPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const crews = await prisma.crew.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { members: true, events: true } },
      members: { where: { role: "LEAD" }, select: { rider: { select: { handle: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Sub-communities"
        description="Riders start their own sub-communities from /sub-communities. This is where you keep them in line with the guidelines — edit what needs correcting, deactivate what doesn't belong, and delete only what should never have existed."
      />

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <form action={createCrewAction} className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg font-semibold text-white">New sub-community</h2>
          <p className="text-xs text-slate-400">Riders can start their own — use this for official ones.</p>
          <input name="name" required placeholder="Sub-community name (e.g. Nashville)" className={inputClass} />
          <input name="description" placeholder="What this sub-community is about" className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="open" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Open to join (uncheck for invite-only)
          </label>
          <button type="submit" className={submitClass}>
            Create Sub-community
          </button>
        </form>

        <form action={setCrewMemberAction} className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg font-semibold text-white">Add / promote member</h2>
          <p className="text-xs text-slate-400">
            Also how you hand a sub-community to a new lead, or add someone to an invite-only one.
          </p>
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

      {crews.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/3 p-5 text-sm text-slate-400 shadow-lg">
          No sub-communities yet.
        </p>
      ) : (
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
                  {!crew.active ? (
                    <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-red-200">
                      Deactivated
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  {crew._count.members} member{crew._count.members === 1 ? "" : "s"} · {crew._count.events} ride
                  {crew._count.events === 1 ? "" : "s"}
                  {crew.members.length > 0
                    ? ` · led by ${crew.members.map((m) => `@${m.rider.handle}`).join(", ")}`
                    : " · no lead"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/community/crews/${crew.id}/edit`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                >
                  Edit
                </Link>
                <CommunityDeleteButton kind="crew" id={crew.id} name={crew.name} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
