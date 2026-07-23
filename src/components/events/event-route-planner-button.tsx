"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Route as RouteIcon, X } from "lucide-react";

import { saveEventRouteAction } from "@/app/(site)/events/[slug]/actions";
import { type PlannerRoutePayload } from "@/components/routes/route-planner";
import { RoutePlannerEmbedded } from "@/components/routes/route-planner-loader";

function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/**
 * The single entry point for event route planning, sitting with the other
 * organizer tools. Drawing and saving here attaches the route to a ride that
 * never had one, or replaces the existing route — so route planning doesn't have
 * to happen while the event is being created.
 */
export function EventRoutePlannerButton({
  eventId,
  hasRoute,
}: {
  eventId: string;
  hasRoute: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlannerRoutePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const draftMiles = draft?.distanceMeters != null ? metersToMiles(draft.distanceMeters).toFixed(1) : "";

  function save() {
    if (!draft?.geometry) {
      setError("Draw a route before saving.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveEventRouteAction(eventId, {
        geometry: JSON.stringify(draft.geometry),
        waypoints: draft.waypoints?.length ? JSON.stringify(draft.waypoints) : "",
        distanceMiles: draftMiles,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
      >
        <RouteIcon className="h-4 w-4 text-sunset" />
        {hasRoute ? "Edit Route" : "Add Route"}
      </button>

      {open &&
        createPortal(
          <div className="safe-pb fixed inset-0 z-[9999] flex flex-col bg-canvas">
            <div className="safe-pt flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Event Route Builder</p>
                <h3 className="font-display text-xl text-asphalt">
                  {hasRoute ? "Replace the official route" : "Official Event Route"}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {error ? (
                    <span className="font-semibold text-red-600">{error}</span>
                  ) : draft?.geometry ? (
                    `Draft route: ${draft.geometryPoints} points${draftMiles ? `, ${draftMiles} miles` : ""}`
                  ) : (
                    "Draw or trace a route, then save it to attach it to this ride."
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save Route"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-canvas px-3 py-2 text-xs font-semibold uppercase tracking-wider text-asphalt transition hover:border-asphalt"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
            </div>
            <div className="w-full flex-1">
              <RoutePlannerEmbedded onRouteDataChange={setDraft} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
