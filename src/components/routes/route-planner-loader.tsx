"use client";

import dynamic from "next/dynamic";
import { type PlannerRoutePayload } from "@/components/routes/route-planner";

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

type RoutePlannerLoaderProps = {
  onRouteDataChange?: (payload: PlannerRoutePayload | null) => void;
};

export function RoutePlannerEmbedded({ onRouteDataChange }: RoutePlannerLoaderProps) {
  return <RoutePlanner onRouteDataChange={onRouteDataChange} />;
}
