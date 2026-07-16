import Link from "next/link";
import { notFound } from "next/navigation";

import { updateChallengeAction } from "@/app/admin/community/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const labelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-400";

export default async function EditChallengePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      createdBy: { select: { handle: true } },
      crew: { select: { name: true } },
      _count: { select: { entries: true } },
    },
  });

  if (!challenge) {
    notFound();
  }

  const update = updateChallengeAction.bind(null, challenge.id);
  const window = `${challenge.startsAt.toLocaleDateString("en-US")} – ${challenge.endsAt.toLocaleDateString("en-US")}`;

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Edit Challenge</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {challenge._count.entries} rider{challenge._count.entries === 1 ? "" : "s"} in ·{" "}
          {challenge.goal.toLocaleString()} {challenge.metric.replaceAll("_", " ").toLowerCase()} · {window}
          {challenge.createdBy ? ` · set by @${challenge.createdBy.handle}` : " · set from this console"}
          {challenge.crew ? ` · ${challenge.crew.name} crew` : ""}
        </p>
      </section>

      <form action={update} className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input id="name" name="name" defaultValue={challenge.name} maxLength={120} className={inputClass} />
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
            defaultValue={challenge.description}
            className={inputClass}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={challenge.active}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5"
          />
          <span>
            Active
            <span className="mt-0.5 block text-xs text-slate-500">
              Unchecking hides it without deleting — riders keep their entries and progress. Prefer this to
              deleting.
            </span>
          </span>
        </label>

        <p className="rounded-lg border border-white/5 bg-white/5 p-3 text-xs text-slate-400">
          The metric, goal, and window aren&apos;t editable. Riders joined under those terms and are scored
          against them — changing them mid-challenge would rewrite what they signed up for. Deactivate it and
          set a new one instead.
        </p>

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
            Save Challenge
          </button>
        </div>
      </form>
    </div>
  );
}
