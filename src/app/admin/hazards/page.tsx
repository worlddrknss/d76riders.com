import { AdminHazardsTable, type AdminHazardRow } from "@/components/admin/admin-hazards-table";
import { formatPostTimestamp } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function AdminHazardsPage() {
  const now = new Date();

  // Report times render in the moderator's own zone — they are deciding whether
  // something flagged two hours ago is still worth acting on.
  const currentUser = await getCurrentUser();
  const viewerTz = currentUser?.id
    ? (await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { timezone: true } }))?.timezone
    : null;

  const hazards = await prisma.hazardReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      type: true,
      description: true,
      lat: true,
      lng: true,
      createdAt: true,
      expiresAt: true,
      clearedAt: true,
      rider: { select: { name: true, handle: true } },
      road: { select: { name: true, slug: true } },
      route: { select: { event: { select: { title: true, slug: true } } } },
    },
  });

  const rows: AdminHazardRow[] = hazards.map((hazard) => ({
    id: hazard.id,
    type: hazard.type,
    description: hazard.description ?? "",
    reporterName: hazard.rider?.name ?? "Unknown",
    reporterHandle: hazard.rider?.handle ?? null,
    roadName: hazard.road?.name ?? null,
    roadSlug: hazard.road?.slug ?? null,
    eventTitle: hazard.route?.event?.title ?? null,
    eventSlug: hazard.route?.event?.slug ?? null,
    reportedLabel: formatPostTimestamp(hazard.createdAt, viewerTz),
    reportedIso: hazard.createdAt.toISOString(),
    // Cleared beats expired: a rider saying "it's gone" is a real signal, and
    // showing it as merely timed out would lose that.
    state: hazard.clearedAt ? "CLEARED" : hazard.expiresAt <= now ? "EXPIRED" : "LIVE",
    lat: hazard.lat,
    lng: hazard.lng,
  }));

  const live = rows.filter((r) => r.state === "LIVE").length;
  const cleared = rows.filter((r) => r.state === "CLEARED").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-3xl text-white">Hazards</h1>
        <p className="mt-2 text-sm text-slate-300">
          Debris, roadwork, police, an accident — what riders have flagged on the roads. Marking one cleared
          keeps the record; deleting is for a report that was abuse or nonsense.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Live now" value={live} tone={live > 0 ? "warn" : "neutral"} />
        <Stat label="Cleared" value={cleared} />
        <Stat label="Reported (last 500)" value={rows.length} />
      </div>

      <AdminHazardsTable hazards={rows} />
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warn" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone === "warn" ? "text-amber-200" : "text-white"}`}>{value}</p>
    </div>
  );
}
