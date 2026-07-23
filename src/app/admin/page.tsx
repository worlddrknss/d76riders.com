import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { slaState } from "@/lib/triage";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [users, riders, sessions, events, pendingReports, openIncidents, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.rider.count(),
      prisma.session.count(),
      prisma.rideEvent.count(),
      prisma.report.findMany({
        where: { status: "PENDING" },
        select: { id: true, createdAt: true, priority: true },
      }),
      prisma.adminIncident.count({ where: { status: { in: ["OPEN", "INVESTIGATING", "MONITORING"] } } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ]);

  const now = new Date();
  const overdue = pendingReports.filter((report) => slaState(report.createdAt, report.priority, now).overdue);

  const cards = [
    { title: "Total Users", value: users, helper: "Registered member accounts" },
    { title: "Rider Profiles", value: riders, helper: "Profiles connected to users" },
    { title: "Active Sessions", value: sessions, helper: "Signed in right now" },
    { title: "Published Events", value: events, helper: "Current events in system" },
  ];

  const queueCards = [
    {
      title: "Triage Queue",
      value: pendingReports.length,
      helper: overdue.length > 0 ? `${overdue.length} past SLA` : "All within SLA",
      href: "/admin/triage",
      alert: overdue.length > 0,
    },
    {
      title: "Open Incidents",
      value: openIncidents,
      helper: "Cases needing follow-up",
      href: "/admin/incidents",
      alert: openIncidents > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Operations</p>
        <h1 className="mt-2 font-display text-4xl text-white">Control Room</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Administrative overview for District 76 Riders. Metrics are live from your production database models.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-300">{card.title}</p>
            <p className="mt-2 font-display text-4xl text-sunset">{card.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-400">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {queueCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`rounded-xl border bg-white/3 p-5 shadow-lg transition hover:border-white/30 ${
              card.alert ? "border-red-400/40" : "border-white/10"
            }`}
          >
            <p className="text-sm font-semibold text-slate-300">{card.title}</p>
            <p className={`mt-2 font-display text-4xl ${card.alert ? "text-red-300" : "text-sunset"}`}>
              {card.value}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-400">{card.helper}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Recent Admin Activity</h2>
          <Link href="/admin/audit" className="text-xs font-semibold text-sunset hover:text-orange-300">
            View audit trail →
          </Link>
        </div>

        {recentAudit.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No admin actions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentAudit.map((log) => (
              <li key={log.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-mono text-xs text-sunset">{log.action}</span>
                <span className="text-slate-300">{log.summary}</span>
                <span className="text-xs text-slate-500">
                  — {log.actor?.name ?? log.actor?.email ?? "system"},{" "}
                  {log.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
