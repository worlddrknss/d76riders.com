"use client";

import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { RoutePlannerEmbedded } from "@/components/routes/route-planner-loader";
import { type PlannerRoutePayload } from "@/components/routes/route-planner";

function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

type RoutePlannerFieldProps = {
  title: string;
  helperText: string;
  savedSummaryLabel: string;
  modalEyebrow: string;
  modalTitle: string;
  hiddenGeometryName: string;
  hiddenWaypointsName: string;
  hiddenDistanceName: string;
};

export function RoutePlannerField({
  title,
  helperText,
  savedSummaryLabel,
  modalEyebrow,
  modalTitle,
  hiddenGeometryName,
  hiddenWaypointsName,
  hiddenDistanceName,
}: RoutePlannerFieldProps) {
  const [draftPlannerData, setDraftPlannerData] = useState<PlannerRoutePayload | null>(null);
  const [savedPlannerData, setSavedPlannerData] = useState<PlannerRoutePayload | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const geometryJson = useMemo(() => {
    if (!savedPlannerData?.geometry) {
      return "";
    }
    return JSON.stringify(savedPlannerData.geometry);
  }, [savedPlannerData]);

  const waypointsJson = useMemo(() => {
    if (!savedPlannerData?.waypoints?.length) {
      return "";
    }
    return JSON.stringify(savedPlannerData.waypoints);
  }, [savedPlannerData]);

  const routeDistanceMiles =
    savedPlannerData?.distanceMeters != null ? metersToMiles(savedPlannerData.distanceMeters).toFixed(1) : "";

  const draftRouteDistanceMiles =
    draftPlannerData?.distanceMeters != null ? metersToMiles(draftPlannerData.distanceMeters).toFixed(1) : "";

  function handleSaveRoute() {
    setSavedPlannerData(draftPlannerData);
    setPlannerOpen(false);
  }

  function handleClearSavedRoute() {
    setSavedPlannerData(null);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-asphalt">{title}</p>
            <p className="text-xs text-muted">{helperText}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-asphalt px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#111]"
            onClick={() => setPlannerOpen(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Launch Route Planner
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">
        {savedPlannerData?.geometry
          ? `${savedSummaryLabel}: ${savedPlannerData.geometryPoints} geometry points${routeDistanceMiles ? `, ${routeDistanceMiles} miles` : ""}.`
          : helperText}
      </p>

      {savedPlannerData ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wider text-asphalt hover:border-asphalt"
            onClick={handleClearSavedRoute}
          >
            Clear Saved Route
          </button>
        </div>
      ) : null}

      <input type="hidden" name={hiddenGeometryName} value={geometryJson} />
      <input type="hidden" name={hiddenWaypointsName} value={waypointsJson} />
      <input type="hidden" name={hiddenDistanceName} value={routeDistanceMiles} />

      <div className={`fixed inset-0 z-100 bg-asphalt/80 backdrop-blur-sm transition ${plannerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-2 overflow-hidden rounded-2xl border border-white/10 bg-canvas shadow-lift sm:inset-4 lg:inset-6">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{modalEyebrow}</p>
              <h3 className="font-display text-xl font-semibold text-asphalt">{modalTitle}</h3>
              <p className="mt-1 text-xs text-muted">
                {draftPlannerData?.geometry
                  ? `Draft route: ${draftPlannerData.geometryPoints} points${draftRouteDistanceMiles ? `, ${draftRouteDistanceMiles} miles` : ""}`
                  : "Draw or trace a route, then save it to attach it."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#cf5a26]"
                onClick={handleSaveRoute}
              >
                Save Route
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-canvas px-3 py-2 text-xs font-semibold uppercase tracking-wider text-asphalt hover:border-asphalt"
                onClick={() => setPlannerOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-4.25rem)] w-full">
            <RoutePlannerEmbedded onRouteDataChange={setDraftPlannerData} />
          </div>
        </div>
      </div>
    </div>
  );
}
