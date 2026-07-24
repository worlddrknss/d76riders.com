"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Images, Route as RouteIcon, Star, Trash2 } from "lucide-react";

import { adminDeleteRoadsAction } from "@/app/admin/roads/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";

export type AdminRoadRow = {
  id: string;
  slug: string;
  name: string;
  creatorName: string;
  creatorHandle: string | null;
  distanceMiles: number | null;
  difficulty: string | null;
  qualityScore: number | null;
  ratingCount: number;
  photoCount: number;
  activeHazards: number;
  hasRoute: boolean;
  createdAt: string;
};

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";

/**
 * The roads console.
 *
 * Roads had no admin surface at all — not a list, not a count, no way to remove
 * a duplicate or a joke entry short of the database. There is deliberately no
 * edit here: roads are community-maintained, so the road's own page already is
 * the editor, and a second one would only drift from it.
 *
 * What the console adds is the overview: which roads nobody has rated, which
 * have no route drawn, and which are carrying live hazard reports.
 */
export function AdminRoadsTable({ roads }: { roads: AdminRoadRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work.");
      }
    });
  }

  const columns: AdminColumn<AdminRoadRow>[] = [
    {
      key: "name",
      header: "Road",
      sortValue: (r) => r.name.toLowerCase(),
      searchValue: (r) => r.name,
      cell: (road) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{road.name}</p>
          <p className="truncate text-xs text-slate-500">
            {road.distanceMiles ? `${road.distanceMiles} mi` : "No distance"}
            {road.difficulty ? ` · ${road.difficulty}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Added by",
      sortValue: (r) => r.creatorName.toLowerCase(),
      searchValue: (r) => `${r.creatorName} ${r.creatorHandle ?? ""}`,
      cell: (road) =>
        road.creatorHandle ? (
          <Link href={`/r/${road.creatorHandle}`} target="_blank" className="text-slate-300 transition hover:text-white">
            {road.creatorName}
          </Link>
        ) : (
          <span className="text-slate-300">{road.creatorName}</span>
        ),
    },
    {
      key: "quality",
      header: "Quality",
      // Unrated sorts below every rated road rather than above it — a road
      // nobody has scored is not a zero-quality road.
      sortValue: (r) => r.qualityScore ?? -1,
      cell: (road) =>
        road.qualityScore != null ? (
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {road.qualityScore.toFixed(1)}
            <span className="text-xs text-slate-500">({road.ratingCount})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500">Unrated</span>
        ),
    },
    {
      key: "content",
      header: "Route / Photos",
      sortValue: (r) => (r.hasRoute ? 1 : 0) * 1000 + r.photoCount,
      cell: (road) => (
        <div className="flex items-center gap-3 text-slate-400">
          <span
            className={`inline-flex items-center gap-1 ${road.hasRoute ? "text-emerald-300" : "text-slate-600"}`}
            title={road.hasRoute ? "Route drawn" : "No route drawn"}
          >
            <RouteIcon className="h-3.5 w-3.5" />
            {road.hasRoute ? "Yes" : "—"}
          </span>
          <span className="inline-flex items-center gap-1" title={`${road.photoCount} photos`}>
            <Images className="h-3.5 w-3.5" />
            {road.photoCount}
          </span>
        </div>
      ),
    },
    {
      key: "hazards",
      header: "Hazards",
      sortValue: (r) => r.activeHazards,
      cell: (road) =>
        road.activeHazards > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-amber-200">
            <AlertTriangle className="h-3 w-3" />
            {road.activeHazards} live
          </span>
        ) : (
          <span className="text-xs text-slate-600">Clear</span>
        ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (road) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/roads/${road.slug}`} target="_blank" className={iconButton} title="View on the site">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <AdminConfirm
            title="Delete this road?"
            confirmLabel="Delete road"
            body={
              <>
                <span className="font-semibold text-white">{road.name}</span>, its route, its{" "}
                {road.ratingCount} rating{road.ratingCount === 1 ? "" : "s"} and {road.photoCount} photo
                {road.photoCount === 1 ? "" : "s"} are removed for good. Roads are community-maintained — if
                it is merely wrong, edit it on the site instead.
              </>
            }
            onConfirm={() => run(() => adminDeleteRoadsAction([road.id]))}
            trigger={(open, busy) => (
              <button
                onClick={open}
                disabled={busy || pending}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      <AdminDataTable
        rows={roads}
        columns={columns}
        rowKey={(road) => road.id}
        searchPlaceholder="Search roads by name or who added them…"
        emptyMessage="No roads yet."
        filters={[
          {
            key: "gaps",
            label: "Gaps",
            options: [
              { value: "NO_ROUTE", label: "No route drawn" },
              { value: "NO_PHOTOS", label: "No photos" },
              { value: "UNRATED", label: "Unrated" },
            ],
          },
          {
            key: "hazards",
            label: "Hazards",
            options: [{ value: "ACTIVE", label: "Carrying live hazards" }],
          },
        ]}
        filterFn={(road, key, value) => {
          if (key === "gaps") {
            if (value === "NO_ROUTE") return !road.hasRoute;
            if (value === "NO_PHOTOS") return road.photoCount === 0;
            if (value === "UNRATED") return road.ratingCount === 0;
          }
          if (key === "hazards") return road.activeHazards > 0;
          return true;
        }}
        bulkActions={(selected, clear) => {
          const ids = selected.map((r) => r.id);
          return (
            <AdminConfirm
              title={`Delete ${ids.length} road${ids.length === 1 ? "" : "s"}?`}
              confirmLabel={`Delete ${ids.length}`}
              body="Their routes, ratings and photos are removed for good."
              onConfirm={() =>
                run(async () => {
                  await adminDeleteRoadsAction(ids);
                  clear();
                })
              }
              trigger={(open, busy) => (
                <button
                  type="button"
                  onClick={open}
                  disabled={busy || pending}
                  className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            />
          );
        }}
      />
    </div>
  );
}
