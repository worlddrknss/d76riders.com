"use client";

import { useActionState } from "react";

import { createRoadAction, type RoadFormState } from "@/app/(site)/roads/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { RoutePlannerField } from "@/components/routes/route-planner-field";

const initialRoadFormState: RoadFormState = {
  error: null,
  success: null,
};

export function CreateRoadForm() {
  const [state, formAction] = useActionState<RoadFormState, FormData>(createRoadAction, initialRoadFormState);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Road Name</label>
          <input id="name" name="name" required className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="difficulty" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Difficulty</label>
          <select id="difficulty" name="difficulty" defaultValue="" className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink">
            <option value="">Not specified</option>
            <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="SCENIC">Scenic</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="scenicRating" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Scenic Rating</label>
          <input id="scenicRating" name="scenicRating" type="number" step="0.1" min={0} max={5} className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="coverImage" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Road Image</label>
          <input id="coverImage" name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Description</label>
        <textarea id="description" name="description" rows={4} className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="routeName" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Route Name</label>
        <input id="routeName" name="routeName" className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="routeDescription" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Route Description</label>
        <textarea id="routeDescription" name="routeDescription" rows={3} className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink" />
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

      {state.error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p> : null}

      <AuthSubmitButton idleLabel="Create Featured Road" pendingLabel="Creating Road..." />
    </form>
  );
}
