import Link from "next/link";

import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { FeatureEventToggle } from "@/components/admin/feature-event-toggle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const now = new Date();
  const events = await prisma.rideEvent.findMany({
    where: { startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: 20,
    select: { id: true, title: true, slug: true, startsAt: true, featured: true, status: true },
  });

  const featuredCount = events.filter((event) => event.featured).length;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Featured Rides"
        description="Featured rides appear as public highlights on the homepage. This is the community's shop window — pick the ones worth showing a stranger."
        actions={
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            {featuredCount} featured
          </span>
        }
      />

      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming rides to feature.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/events/${event.slug}`} className="font-semibold text-white hover:text-sunset">
                      {event.title}
                    </Link>
                    {event.status === "CANCELLED" ? (
                      <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-red-200">
                        Cancelled
                      </span>
                    ) : null}
                  </div>
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
    </div>
  );
}
