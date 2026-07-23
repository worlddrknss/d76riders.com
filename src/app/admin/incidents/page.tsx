import Link from "next/link";
import type { AdminIncidentStatus, IncidentSeverity, Prisma } from "@prisma/client";
import { ClipboardList, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  CRITICAL: "border-red-400/40 bg-red-500/15 text-red-200",
  HIGH: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  NORMAL: "border-sunset/40 bg-sunset/15 text-orange-200",
  LOW: "border-white/15 bg-white/5 text-slate-300",
};

const STATUS_STYLES: Record<AdminIncidentStatus, string> = {
  OPEN: "border-red-400/30 bg-red-500/10 text-red-200",
  INVESTIGATING: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  MONITORING: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  RESOLVED: "border-forest/40 bg-forest/15 text-emerald-200",
  CLOSED: "border-white/15 bg-white/5 text-slate-400",
};

const OPEN_STATUSES: AdminIncidentStatus[] = ["OPEN", "INVESTIGATING", "MONITORING"];

export default async function AdminIncidentsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams.status?.toUpperCase();

  const where: Prisma.AdminIncidentWhereInput =
    statusFilter && statusFilter in STATUS_STYLES
      ? { status: statusFilter as AdminIncidentStatus }
      : statusFilter === "ALL"
        ? {}
        : { status: { in: OPEN_STATUSES } };

  const [incidents, openCount] = await Promise.all([
    prisma.adminIncident.findMany({
      where,
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        rider: { select: { handle: true, name: true } },
        event: { select: { slug: true, title: true } },
        openedBy: { select: { name: true, email: true } },
        _count: { select: { notes: true } },
      },
    }),
    prisma.adminIncident.count({ where: { status: { in: OPEN_STATUSES } } }),
  ]);

  const filters = [
    { label: "Open", href: "/admin/incidents", active: !statusFilter },
    ...(Object.keys(STATUS_STYLES) as AdminIncidentStatus[]).map((status) => ({
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      href: `/admin/incidents?status=${status}`,
      active: statusFilter === status,
    })),
    { label: "All", href: "/admin/incidents?status=ALL", active: statusFilter === "ALL" },
  ];

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
            <h1 className="mt-2 font-display text-4xl text-white">Incidents</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Private case files for follow-up on riders, events, and reports. Notes here are staff-only and never
              shown to members.
            </p>
          </div>
          <Link
            href="/admin/incidents/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-sunset/25"
          >
            <Plus className="h-4 w-4" />
            New Incident
          </Link>
        </div>
        <div className="mt-4 flex gap-3 text-sm">
          <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 font-semibold text-red-200">
            {openCount} open
          </span>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Incident filters">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filter.active
                ? "border-sunset/50 bg-sunset/15 text-white"
                : "border-white/10 bg-white/3 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {incidents.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 p-12 text-center shadow-lg">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">No incidents match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/admin/incidents/${incident.id}`}
              className="block rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg transition hover:border-white/25"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    SEVERITY_STYLES[incident.severity]
                  }`}
                >
                  {incident.severity}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLES[incident.status]
                  }`}
                >
                  {incident.status}
                </span>
                <span className="text-xs text-slate-500">
                  {incident.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {incident._count.notes > 0 ? (
                  <span className="text-xs text-slate-500">
                    {incident._count.notes} note{incident._count.notes === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 font-display text-lg text-white">{incident.title}</p>
              {incident.summary ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-300">{incident.summary}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                {incident.rider ? <span>Rider: @{incident.rider.handle}</span> : null}
                {incident.event ? <span>Event: {incident.event.title}</span> : null}
                <span>Opened by {incident.openedBy.name ?? incident.openedBy.email}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
