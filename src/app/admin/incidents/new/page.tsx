import Link from "next/link";

import { createIncidentAction } from "@/app/admin/incidents/actions";

export default async function NewIncidentPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">New Incident</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Open a private case file. Link it to a rider or event to keep the history in one place.
        </p>
      </section>

      {searchParams.error === "title" ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          A title is required to open an incident.
        </p>
      ) : null}

      <form
        action={createIncidentAction}
        className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
      >
        <div>
          <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="Short description of what happened"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <label htmlFor="summary" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Summary
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={4}
            maxLength={2000}
            placeholder="Context, what was observed, and any immediate action taken."
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="severity" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              defaultValue="NORMAL"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="riderHandle"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Rider handle
            </label>
            <input
              id="riderHandle"
              name="riderHandle"
              placeholder="ace"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="eventSlug" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Event slug
            </label>
            <input
              id="eventSlug"
              name="eventSlug"
              placeholder="sunday-canyon-run"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/incidents"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25"
          >
            Open Incident
          </button>
        </div>
      </form>
    </div>
  );
}
