"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { reportHazardAction, type HazardFormState } from "@/app/(site)/roads/hazard-actions";
import { HazardMap, type HazardPin } from "@/components/hazards/hazard-map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { HAZARD_META, HAZARD_TYPES } from "@/lib/hazards";
import type { HazardType } from "@prisma/client";

const initialState: HazardFormState = { error: null, success: null };

type ReportHazardDialogProps = {
  roadId: string;
  coordinates: [number, number][];
  hazards: HazardPin[];
  // A sensible starting pin when the rider hasn't tapped yet — the route's KSU
  // or midpoint, so a hazard always has a location even without a tap.
  defaultPoint: { lat: number; lng: number };
};

export function ReportHazardDialog({ roadId, coordinates, hazards, defaultPoint }: ReportHazardDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<HazardType>("DEBRIS");
  const [point, setPoint] = useState<{ lat: number; lng: number }>(defaultPoint);
  const [state, formAction] = useActionState<HazardFormState, FormData>(reportHazardAction, initialState);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <TriangleAlert className="h-4 w-4 text-sunset" />
        Report Hazard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report a hazard</DialogTitle>
          </DialogHeader>

          {state.success ? (
            <div className="mt-3 space-y-4">
              <p className="rounded-md border border-forest/40 bg-forest/10 px-3 py-2 text-sm text-forest">
                {state.success}
              </p>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="roadId" value={roadId} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="lat" value={point.lat} />
            <input type="hidden" name="lng" value={point.lng} />

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">What is it</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {HAZARD_TYPES.map((t) => {
                  const active = t === type;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        active
                          ? "border-sunset bg-sunset/10 text-ink"
                          : "border-border text-muted hover:border-sunset/50 hover:text-ink"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HAZARD_META[t].color }} />
                      {HAZARD_META[t].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">{HAZARD_META[type].blurb}.</p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Where</span>
              <div className="mt-2">
                <HazardMap
                  coordinates={coordinates}
                  hazards={hazards}
                  className="h-56 w-full"
                  pickMode
                  pending={point}
                  onPick={(lat, lng) => setPoint({ lat, lng })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="hazard-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Anything to add <span className="normal-case text-muted/70">(optional)</span>
              </label>
              <Textarea
                id="hazard-desc"
                name="description"
                rows={2}
                maxLength={280}
                placeholder="Gravel across the eastbound lane just past the bridge."
                className="mt-1"
              />
            </div>

            {state.error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" size="sm">
                Post hazard
              </Button>
            </div>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
