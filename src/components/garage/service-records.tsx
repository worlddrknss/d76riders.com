"use client";

import { useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";

import type { ServiceType } from "@prisma/client";

export type ServiceRecordItem = {
  id: string;
  title: string;
  serviceType: ServiceType;
  cost: number | null;
  mileage: number | null;
  servicedAt: string; // ISO — serialized for the client boundary
  notes: string | null;
};

const TYPE_LABEL: Record<ServiceType, string> = {
  MAINTENANCE: "Maintenance",
  REPAIR: "Repair",
  INSPECTION: "Inspection",
  UPGRADE: "Upgrade",
  OTHER: "Other",
};

const TYPE_TINT: Record<ServiceType, string> = {
  MAINTENANCE: "bg-forest/10 text-forest",
  REPAIR: "bg-sunset/10 text-sunset",
  INSPECTION: "bg-asphalt/5 text-asphalt",
  UPGRADE: "bg-sunset/10 text-sunset",
  OTHER: "bg-asphalt/5 text-muted",
};

const FILTERS: { key: "ALL" | ServiceType; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "REPAIR", label: "Repair" },
  { key: "INSPECTION", label: "Inspection" },
  { key: "UPGRADE", label: "Upgrade" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ServiceRecords({
  items,
  deleteAction,
  showCosts = true,
}: {
  items: ServiceRecordItem[];
  /** Owner-only: bound per row to remove the service record. */
  deleteAction?: (id: string) => Promise<void>;
  /** Hide per-item cost for non-owner (read-only) views. */
  showCosts?: boolean;
}) {
  const [filter, setFilter] = useState<"ALL" | ServiceType>("ALL");

  const shown = filter === "ALL" ? items : items.filter((r) => r.serviceType === filter);
  // Only offer filter chips that actually have records behind them.
  const available = FILTERS.filter((f) => f.key === "ALL" || items.some((r) => r.serviceType === f.key));

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
        <Wrench className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">No service history yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {available.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              filter === f.key
                ? "bg-sunset text-white"
                : "border border-border bg-surface text-muted hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {shown.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-ink">{r.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${TYPE_TINT[r.serviceType]}`}>
                  {TYPE_LABEL[r.serviceType]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {[
                  r.mileage != null ? `${r.mileage.toLocaleString("en-US")} mi` : null,
                  formatDate(r.servicedAt),
                  showCosts && r.cost != null
                    ? r.cost.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {r.notes && <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{r.notes}</p>}
              {deleteAction && (
                <form action={deleteAction.bind(null, r.id)} className="mt-2">
                  <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
