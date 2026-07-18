import { Gauge, Wrench } from "lucide-react";

import type { ModificationCategory } from "@prisma/client";
import { mediaUrl } from "@/lib/media-url";

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

function currency(value: number | null): string | null {
  if (value == null) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/**
 * Vertical build timeline — one node per modification, newest first, each with
 * its category, cost, mileage, notes, and a photo with a "+N more" count. The
 * connecting rail is drawn with a left border on each row.
 */
export function BuildTimeline({
  items,
  deleteAction,
}: {
  items: BuildTimelineItem[];
  /** Owner-only: bound per row to remove the modification. */
  deleteAction?: (id: string) => Promise<void>;
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
    <ol className="relative space-y-6">
      {items.map((item) => {
        const cover = item.photos[0];
        const extra = item.photos.length - 1;
        return (
          <li key={item.id} className="relative pl-8">
            {/* Rail + node */}
            <span className="absolute left-1.75 top-2 -bottom-6 w-px bg-border last:hidden" aria-hidden />
            <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-sunset bg-surface" aria-hidden />

            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {item.installedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              <div className="flex gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-sunset">
                    {CATEGORY_LABEL[item.category]}
                  </p>
                  <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">{item.title}</h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {currency(item.cost) && (
                      <span className="font-semibold text-sunset">{currency(item.cost)}</span>
                    )}
                    {item.mileage != null && (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Gauge className="h-3.5 w-3.5" />
                        {item.mileage.toLocaleString("en-US")} mi
                      </span>
                    )}
                  </div>

                  {item.notes && <p className="mt-2 text-sm leading-relaxed text-ink/80">{item.notes}</p>}
                  {deleteAction && (
                    <form action={deleteAction.bind(null, item.id)} className="mt-3">
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  )}
                </div>

                {cover && (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-canvas sm:h-28 sm:w-28">
                    <img src={mediaUrl(cover.url)} alt={item.title} className="h-full w-full object-cover" />
                    {extra > 0 && (
                      <span className="absolute bottom-1 right-1 rounded-md bg-asphalt/80 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                        +{extra}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
