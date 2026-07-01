"use client";

import { RoutePlannerField } from "@/components/routes/route-planner-field";

export function EventRoutePlannerField() {
  return (
    <RoutePlannerField
      title="Route Planner"
      helperText="Launch full-screen planner to draw the official event route."
      savedSummaryLabel="Saved route"
      modalEyebrow="Event Route Builder"
      modalTitle="Official Event Route Planner"
      hiddenGeometryName="routeGeometryJson"
      hiddenWaypointsName="routeWaypointsJson"
      hiddenDistanceName="routeDistanceMiles"
    />
  );
}
