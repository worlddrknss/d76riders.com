"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { createRoadAction, type RoadFormState } from "@/app/(site)/roads/actions";
import { RoutePlannerField } from "@/components/routes/route-planner-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: RoadFormState = { error: null, success: null };

export function CreateRoadDialog() {
  const params = useSearchParams();
  // Opens automatically when reached via the top-bar "+ Create → New road".
  const [open, setOpen] = useState(() => params.get("new") === "1");
  const [state, formAction] = useActionState<RoadFormState, FormData>(createRoadAction, initialState);

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Road
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Featured Road</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="create-road-name" className="text-xs font-semibold uppercase tracking-wide text-muted">Road Name</label>
                <Input id="create-road-name" name="name" required className="mt-1" />
              </div>
              <div>
                <label htmlFor="create-road-diff" className="text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</label>
                <select id="create-road-diff" name="difficulty" defaultValue="" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                  <option value="">Not specified</option>
                  <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="SCENIC">Scenic</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="create-road-scenic" className="text-xs font-semibold uppercase tracking-wide text-muted">Scenic Rating</label>
                <Input id="create-road-scenic" name="scenicRating" type="number" step="0.1" min={0} max={5} className="mt-1" />
              </div>
              <div>
                <label htmlFor="create-road-img" className="text-xs font-semibold uppercase tracking-wide text-muted">Road Image</label>
                <Input id="create-road-img" name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
              </div>
            </div>

            <div>
              <label htmlFor="create-road-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
              <Textarea id="create-road-desc" name="description" rows={3} className="mt-1" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="create-road-rname" className="text-xs font-semibold uppercase tracking-wide text-muted">Route Name</label>
                <Input id="create-road-rname" name="routeName" className="mt-1" />
              </div>
              <div>
                <label htmlFor="create-road-rdesc" className="text-xs font-semibold uppercase tracking-wide text-muted">Route Description</label>
                <Input id="create-road-rdesc" name="routeDescription" className="mt-1" />
              </div>
            </div>

            <RoutePlannerField
              title="Featured Road Route Planner"
              helperText="Launch full-screen planner to map this featured road."
              savedSummaryLabel="Saved road route"
              modalEyebrow="Featured Road Builder"
              modalTitle="Featured Road Route Planner"
              hiddenGeometryName="routeGeometryJson"
              hiddenWaypointsName="routeWaypointsJson"
              hiddenDistanceName="routeDistanceMiles"
            />

            {state.error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm">Create Road</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
