"use client";

import { useActionState } from "react";

import { createBikeAction, type GarageFormState } from "@/app/garage/mine/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialGarageFormState: GarageFormState = {
  error: null,
  success: null,
};

export function CreateBikeForm() {
  const [state, formAction] = useActionState<GarageFormState, FormData>(
    createBikeAction,
    initialGarageFormState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-canvas p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Bike Name</label>
          <input id="name" name="name" type="text" required className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="make" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Make</label>
          <input id="make" name="make" type="text" required className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="model" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Model</label>
          <input id="model" name="model" type="text" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="year" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Year</label>
          <input id="year" name="year" type="number" min={1900} max={2100} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Type</label>
          <select id="type" name="type" defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none">
            <option value="">Not specified</option>
            <option value="NAKED">Naked</option>
            <option value="CRUISER">Cruiser</option>
            <option value="ADVENTURE">Adventure</option>
            <option value="SPORT">Sport</option>
            <option value="TOURING">Touring</option>
            <option value="STANDARD">Standard</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="engineType" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Engine Type</label>
          <input id="engineType" name="engineType" type="text" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="displacement" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Displacement</label>
          <input id="displacement" name="displacement" type="text" placeholder="799cc" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bikePhoto" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Bike Photo</label>
          <input id="bikePhoto" name="bikePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
        </div>
      </div>

      {state.error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p> : null}

      <AuthSubmitButton idleLabel="Add Bike" pendingLabel="Adding Bike..." />
    </form>
  );
}
