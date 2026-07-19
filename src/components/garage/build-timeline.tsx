import { Wrench } from "lucide-react";

import type { ModificationCategory } from "@prisma/client";

export type BuildTimelineItem = {
  id: string;
  title: string;
  category: ModificationCategory;
  cost: number | null;
  mileage: number | null;
  installedAt: Date;
  notes: string | null;
  photos: { url: string }[];
};

const CATEGORY_LABEL: Record<ModificationCategory, string> = {
  EXHAUST: "Exhaust",
  EXTERIOR: "Exterior",
  SUSPENSION: "Suspension",
  PERFORMANCE: "Performance",
  WHEELS_TIRES: "Wheels & Tires",
  LIGHTING: "Lighting",
  ELECTRICAL: "Electrical",
  PROTECTION: "Protection",
  ERGONOMICS: "Ergonomics",
  ENGINE: "Engine",
  OTHER: "Other",
};

/**
 * Compact build timeline (matches the mock): one dot per modification, newest
 * first, with the title and "date · category" underneath. Owners get a Delete
 * on hover; the full cost/mileage/notes/photos live behind the edit flow.
 */
export function BuildTimeline({
  items,
  deleteAction,
}: {
  items: BuildTimelineItem[];
  deleteAction?: (id: string) => Promise<void>;
  /** Kept for API compatibility; the compact view omits per-item cost. */
  showCosts?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
        <Wrench className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">No modifications logged yet.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 pl-1">
      {items.map((item) => (
        <li key={item.id} className="group relative pl-5">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-sunset" aria-hidden />
          <span className="absolute -bottom-4 left-0.75 top-4 w-px bg-border last:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{item.title}</p>
              <p className="text-xs text-muted">
                {item.installedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {CATEGORY_LABEL[item.category]}
              </p>
            </div>
            {deleteAction && (
              <form action={deleteAction.bind(null, item.id)}>
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
    </ol>
  );
}
