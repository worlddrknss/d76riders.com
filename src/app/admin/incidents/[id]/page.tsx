import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";

import { addIncidentNoteAction, updateIncidentAction } from "@/app/admin/incidents/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const incident = await prisma.adminIncident.findUnique({
    where: { id },
    include: {
      rider: { select: { handle: true, name: true } },
      event: { select: { slug: true, title: true } },
      openedBy: { select: { name: true, email: true } },
      closedBy: { select: { name: true, email: true } },
      rideIncident: { select: { id: true, notes: true, locationText: true, createdAt: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, email: true } } },
      },
    },
  });

  if (!incident) {
    notFound();
  }

  const update = updateIncidentAction.bind(null, incident.id);
  const addNote = addIncidentNoteAction.bind(null, incident.id);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <Link href="/admin/incidents" className="text-xs font-semibold text-slate-400 hover:text-white">
          ← All incidents
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{incident.title}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          <span>
            Opened by {incident.openedBy.name ?? incident.openedBy.email} on{" "}
            {incident.createdAt.toLocaleString("en-US")}
          </span>
          {incident.closedAt ? (
            <span>
              Closed by {incident.closedBy?.name ?? incident.closedBy?.email ?? "—"} on{" "}
              {incident.closedAt.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {incident.rider ? (
            <Link
              href={`/r/${incident.rider.handle}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 hover:text-white"
            >
              Rider: @{incident.rider.handle}
            </Link>
          ) : null}
          {incident.event ? (
            <Link
              href={`/events/${incident.event.slug}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 hover:text-white"
            >
              Event: {incident.event.title}
            </Link>
          ) : null}
        </div>
      </section>

      {incident.rideIncident ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/5 p-5 shadow-lg">
          <h2 className="font-display text-lg font-semibold text-white">Linked Rider Down alert</h2>
          <p className="mt-1 text-xs text-slate-400">
            Raised {incident.rideIncident.createdAt.toLocaleString("en-US")}
            {incident.rideIncident.locationText ? ` near ${incident.rideIncident.locationText}` : ""}
          </p>
          {incident.rideIncident.notes ? (
            <p className="mt-2 text-sm text-slate-300">{incident.rideIncident.notes}</p>
          ) : null}
        </section>
      ) : null}

      <form action={update} className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Case details</h2>

        <div>
          <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={incident.title}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
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
            defaultValue={incident.summary ?? ""}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="severity" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              defaultValue={incident.severity}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={incident.status}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="MONITORING">Monitoring</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="resolution" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Resolution
          </label>
          <textarea
            id="resolution"
            name="resolution"
            rows={3}
            maxLength={2000}
            defaultValue={incident.resolution ?? ""}
            placeholder="How this was closed out."
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25"
          >
            Save Changes
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <h2 className="font-display text-lg font-semibold text-white">Private notes</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Staff-only. Notes are append-only and are never shown to members.
        </p>

        <form action={addNote} className="mt-4 space-y-2">
          <textarea
            name="body"
            rows={3}
            required
            maxLength={5000}
            placeholder="Add a note…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30"
            >
              Add Note
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-3">
          {incident.notes.length === 0 ? (
            <p className="text-sm text-slate-500">No notes yet.</p>
          ) : (
            incident.notes.map((note) => (
              <article key={note.id} className="rounded-lg border border-white/5 bg-white/5 p-4">
                <p className="text-xs text-slate-500">
                  {note.author.name ?? note.author.email} · {note.createdAt.toLocaleString("en-US")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{note.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
