import { KIND_META } from "@/lib/map";
import type { PlannerWaypoint } from "@/lib/routing";

/** Ordered turn-by-turn stop list for a saved route (Start · Fuel · Rest · End). */
export function RouteStops({ waypoints }: { waypoints: PlannerWaypoint[] }) {
  if (waypoints.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt">Route Stops</h3>
      <ol className="mt-3">
        {waypoints.map((wp, i) => {
          const meta = KIND_META[wp.kind];
          const last = i === waypoints.length - 1;
          return (
            <li key={wp.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && <span aria-hidden className="absolute bottom-0 left-2.5 top-6 w-px bg-border" />}
              <span
                className="mt-1 h-5 w-5 shrink-0 rounded-full ring-2 ring-surface"
                style={{ backgroundColor: meta.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{meta.label}</p>
                {wp.label ? <p className="truncate text-xs text-muted">{wp.label}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
