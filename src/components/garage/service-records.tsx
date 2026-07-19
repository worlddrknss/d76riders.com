import { Wrench } from "lucide-react";

import type { ServiceType } from "@prisma/client";

export type ServiceRecordItem = {
  id: string;
  title: string;
  serviceType: ServiceType;
  cost: number | null;
  mileage: number | null;
  servicedAt: string; // ISO — serialized for the client boundary
  notes: string | null;
  remindAt?: string | null; // ISO — optional "do this again" reminder (date)
  remindMileage?: number | null; // optional odometer target for the reminder
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Compact service log (matches the mock): one row per record with the title and
 * mileage on the left, the serviced date on the right. Owners get a Delete on
 * hover; cost/notes/reminders live behind the edit flow.
 */
export function ServiceRecords({
  items,
  deleteAction,
}: {
  items: ServiceRecordItem[];
  /** Owner-only: bound per row to remove the service record. */
  deleteAction?: (id: string) => Promise<void>;
  /** Hide per-item cost for non-owner (read-only) views. */
  showCosts?: boolean;
  /** The bike's current odometer — kept for API compatibility. */
  currentMileage?: number | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
        <Wrench className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">No service history yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li key={r.id} className="group flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{r.title}</p>
            {r.mileage != null && (
              <p className="text-xs text-muted">{r.mileage.toLocaleString("en-US")} mi</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted">{formatDate(r.servicedAt)}</span>
            {deleteAction && (
              <form action={deleteAction.bind(null, r.id)}>
                <button
                  type="submit"
                  className="text-xs font-semibold text-red-600 opacity-0 transition hover:underline group-hover:opacity-100"
                >
                  Delete
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
