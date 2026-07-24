import { AdminRoadsTable, type AdminRoadRow } from "@/components/admin/admin-roads-table";
import { prisma } from "@/lib/prisma";

export default async function AdminRoadsPage() {
  const now = new Date();

  const roads = await prisma.road.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      distanceMiles: true,
      difficulty: true,
      qualityScore: true,
      routeId: true,
      createdAt: true,
      rider: { select: { name: true, handle: true } },
      _count: { select: { ratings: true, galleryItems: true } },
      // Live only: a hazard that has been cleared or has run out of time is not
      // something a moderator needs to look at.
      hazards: {
        where: { clearedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      },
    },
  });

  const rows: AdminRoadRow[] = roads.map((road) => ({
    id: road.id,
    slug: road.slug,
    name: road.name,
    creatorName: road.rider?.name ?? "Unknown",
    creatorHandle: road.rider?.handle ?? null,
    distanceMiles: road.distanceMiles,
    difficulty: road.difficulty,
    qualityScore: road.qualityScore,
    ratingCount: road._count.ratings,
    photoCount: road._count.galleryItems,
    activeHazards: road.hazards.length,
    hasRoute: Boolean(road.routeId),
    createdAt: road.createdAt.toISOString(),
  }));

  const noRoute = rows.filter((r) => !r.hasRoute).length;
  const unrated = rows.filter((r) => r.ratingCount === 0).length;
  const withHazards = rows.filter((r) => r.activeHazards > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Community</p>
        <h1 className="mt-2 font-display text-3xl text-white">Roads</h1>
        <p className="mt-2 text-sm text-slate-300">
          Every road in the directory. Roads are community-maintained, so editing happens on the road&apos;s
          own page — this is the overview: what is missing a route, what nobody has rated, and what is
          carrying live hazards.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Roads" value={rows.length} />
        <Stat label="No route drawn" value={noRoute} tone={noRoute > 0 ? "warn" : "neutral"} />
        <Stat label="Unrated" value={unrated} tone={unrated > 0 ? "warn" : "neutral"} />
        <Stat label="With live hazards" value={withHazards} tone={withHazards > 0 ? "warn" : "neutral"} />
      </div>

      <AdminRoadsTable roads={rows} />
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
