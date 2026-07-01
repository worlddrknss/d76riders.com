import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [users, riders, sessions, events] = await Promise.all([
    prisma.user.count(),
    prisma.rider.count(),
    prisma.session.count(),
    prisma.rideEvent.count(),
  ]);

  const cards = [
    {
      title: "Total Users",
      value: users,
      helper: "Registered member accounts",
    },
    {
      title: "Rider Profiles",
      value: riders,
      helper: "Profiles connected to users",
    },
    {
      title: "Active Sessions",
      value: sessions,
      helper: "Signed in right now",
    },
    {
      title: "Published Events",
      value: events,
      helper: "Current events in system",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(6,78,59,0.2),rgba(30,64,175,0.2))] p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Control Room</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Administrative overview for District 76 Riders. Metrics are live from your production database models.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-white/10 bg-[#020817]/85 p-5 shadow-xl shadow-black/20">
            <p className="text-sm font-semibold text-slate-300">{card.title}</p>
            <p className="mt-2 font-display text-4xl font-bold text-white">{card.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-400">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-[#020817]/85 p-5 shadow-xl shadow-black/20">
          <h2 className="font-display text-xl font-semibold text-white">Admin Scope (Phase 1)</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Role-gated control room route under /admin.</li>
            <li>Live account/session/event telemetry cards.</li>
            <li>Shared content editor route for upcoming moderation and publishing flows.</li>
          </ul>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#020817]/85 p-5 shadow-xl shadow-black/20">
          <h2 className="font-display text-xl font-semibold text-white">Next Wiring</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Persist editor drafts to a dedicated admin content model.</li>
            <li>Add role and permission management UI for multi-role accounts.</li>
            <li>Add audit log cards and moderation queue widgets.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
