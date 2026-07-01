"use client";

import dynamic from "next/dynamic";

// MapLibre references `window`/`document` at import time, so the planner must be
// loaded client-only. `ssr: false` is only allowed inside a Client Component.
const RoutePlanner = dynamic(
  () => import("@/components/routes/route-planner").then((m) => m.RoutePlanner),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-canvas text-sm text-muted">
        Loading planner…
      </div>
    ),
  },
);

export function RoutePlannerLoader() {
  return <RoutePlanner />;
}
