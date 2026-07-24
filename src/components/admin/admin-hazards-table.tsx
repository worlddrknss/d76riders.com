"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Trash2 } from "lucide-react";

import { adminClearHazardsAction, adminDeleteHazardsAction } from "@/app/admin/roads/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";

export type AdminHazardRow = {
  id: string;
  type: string;
  description: string;
  reporterName: string;
  reporterHandle: string | null;
  roadName: string | null;
  roadSlug: string | null;
  eventTitle: string | null;
  eventSlug: string | null;
  reportedLabel: string;
  reportedIso: string;
  /** Live = not cleared and not yet expired. */
  state: "LIVE" | "CLEARED" | "EXPIRED";
  lat: number;
  lng: number;
};

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";
const bulkButton =
  "rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15";

function stateBadge(state: AdminHazardRow["state"]) {
  const styles =
    state === "LIVE" ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
    : state === "CLEARED" ? "border-forest/40 bg-forest/15 text-emerald-200"
    : "border-white/15 bg-white/5 text-slate-400";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${styles}`}>
      {state}
    </span>
  );
}

/**
 * Hazard reports.
 *
 * These are the safety-critical end of the site — debris, roadwork, an accident
 * on a road riders are about to take — and the console could not see them at
 * all. Clearing is the everyday action and any rider can do it from the road;
 * deleting is here for the report that was abuse or nonsense and should leave
 * no trace.
 */
export function AdminHazardsTable({ hazards }: { hazards: AdminHazardRow[] }) {
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

  const columns: AdminColumn<AdminHazardRow>[] = [
    {
      key: "type",
      header: "Hazard",
      sortValue: (h) => h.type,
      searchValue: (h) => `${h.type} ${h.description}`,
      cell: (hazard) => (
        <div className="min-w-0">
          <p className="font-semibold text-white">{hazard.type}</p>
          {hazard.description ? (
            <p className="truncate text-xs text-slate-500">{hazard.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "where",
      header: "Where",
      searchValue: (h) => `${h.roadName ?? ""} ${h.eventTitle ?? ""}`,
      cell: (hazard) =>
        hazard.roadSlug ? (
          <Link href={`/roads/${hazard.roadSlug}`} target="_blank" className="text-slate-300 transition hover:text-white">
            {hazard.roadName}
          </Link>
        ) : hazard.eventSlug ? (
          <Link href={`/events/${hazard.eventSlug}`} target="_blank" className="text-slate-300 transition hover:text-white">
            {hazard.eventTitle}
          </Link>
        ) : (
          <span className="text-xs text-slate-500">
            {hazard.lat.toFixed(3)}, {hazard.lng.toFixed(3)}
          </span>
        ),
    },
    {
      key: "reporter",
      header: "Reported by",
      sortValue: (h) => h.reporterName.toLowerCase(),
      searchValue: (h) => `${h.reporterName} ${h.reporterHandle ?? ""}`,
      cell: (hazard) =>
        hazard.reporterHandle ? (
          <Link href={`/r/${hazard.reporterHandle}`} target="_blank" className="text-slate-300 transition hover:text-white">
            {hazard.reporterName}
          </Link>
        ) : (
          <span className="text-slate-300">{hazard.reporterName}</span>
        ),
    },
    {
      key: "when",
      header: "Reported",
      sortValue: (h) => h.reportedIso,
      cell: (hazard) => <span className="text-slate-400">{hazard.reportedLabel}</span>,
    },
    {
      key: "state",
      header: "State",
      sortValue: (h) => h.state,
      cell: (hazard) => stateBadge(hazard.state),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (hazard) => (
        <div className="flex items-center justify-end gap-1">
          {hazard.roadSlug || hazard.eventSlug ? (
            <Link
              href={hazard.roadSlug ? `/roads/${hazard.roadSlug}` : `/events/${hazard.eventSlug}`}
              target="_blank"
              className={iconButton}
              title="View on the site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          {hazard.state === "LIVE" ? (
            <button
              onClick={() => run(() => adminClearHazardsAction([hazard.id]))}
              disabled={pending}
              className="rounded p-1.5 text-emerald-400 transition hover:bg-emerald-500/10"
              title="Mark cleared"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <AdminConfirm
            title="Delete this hazard report?"
            confirmLabel="Delete report"
            body="The report disappears from the road entirely, as if it was never made. To say the hazard is gone, mark it cleared instead — that keeps the record."
            onConfirm={() => run(() => adminDeleteHazardsAction([hazard.id]))}
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
        rows={hazards}
        columns={columns}
        rowKey={(hazard) => hazard.id}
        searchPlaceholder="Search by type, road, or reporter…"
        emptyMessage="No hazards have been reported."
        filters={[
          {
            key: "state",
            label: "State",
            options: [
              { value: "LIVE", label: "Live" },
              { value: "CLEARED", label: "Cleared" },
              { value: "EXPIRED", label: "Expired" },
            ],
          },
        ]}
        filterFn={(hazard, key, value) => (key === "state" ? hazard.state === value : true)}
        bulkActions={(selected, clear) => {
          const ids = selected.map((h) => h.id);
          const liveIds = selected.filter((h) => h.state === "LIVE").map((h) => h.id);
          return (
            <>
              {liveIds.length > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await adminClearHazardsAction(liveIds);
                      clear();
                    })
                  }
                  className={bulkButton}
                >
                  Mark {liveIds.length} cleared
                </button>
              ) : null}
              <AdminConfirm
                title={`Delete ${ids.length} report${ids.length === 1 ? "" : "s"}?`}
                confirmLabel={`Delete ${ids.length}`}
                body="They disappear from their roads entirely. To say the hazards are gone, mark them cleared instead."
                onConfirm={() =>
                  run(async () => {
                    await adminDeleteHazardsAction(ids);
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
            </>
          );
        }}
      />
    </div>
  );
}
