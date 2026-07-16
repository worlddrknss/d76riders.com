import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCrewAction } from "@/app/admin/community/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const labelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-400";

export default async function EditCrewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const crew = await prisma.crew.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, events: true } },
      members: {
        where: { role: "LEAD" },
        select: { rider: { select: { handle: true, name: true } } },
      },
    },
  });

  if (!crew) {
    notFound();
  }

  const update = updateCrewAction.bind(null, crew.id);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Edit Crew</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {crew._count.members} member{crew._count.members === 1 ? "" : "s"} · {crew._count.events} ride
          {crew._count.events === 1 ? "" : "s"}
          {crew.members.length > 0
            ? ` · led by ${crew.members.map((m) => `@${m.rider.handle}`).join(", ")}`
            : " · no lead"}
        </p>
      </section>

      <form action={update} className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input id="name" name="name" defaultValue={crew.name} maxLength={80} className={inputClass} />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={300}
            defaultValue={crew.description}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="open"
              defaultChecked={crew.open}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Open to join
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="active"
              defaultChecked={crew.active}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5"
            />
            <span>
              Active
              <span className="mt-0.5 block text-xs text-slate-500">
                Unchecking hides the crew from the community without deleting it — members and their history
                stay. Prefer this to deleting.
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/community"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25"
          >
            Save Crew
          </button>
        </div>
      </form>
    </div>
  );
}
