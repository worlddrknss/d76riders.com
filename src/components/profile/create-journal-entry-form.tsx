"use client";

import { useActionState } from "react";

import { createJournalEntryAction, type JournalFormState } from "@/app/riders/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialJournalFormState: JournalFormState = {
  error: null,
  success: null,
};

export function CreateJournalEntryForm() {
  const [state, formAction] = useActionState<JournalFormState, FormData>(
    createJournalEntryAction,
    initialJournalFormState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-canvas p-4">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Title</label>
        <input id="title" name="title" type="text" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="body" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ride Story</label>
        <textarea id="body" name="body" rows={5} required className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none" placeholder="How did the ride go? Pace, roads, crew, weather, lessons learned..." />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ridePhoto" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ride Photo</label>
        <input id="ridePhoto" name="ridePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
      </div>

      {state.error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p> : null}

      <AuthSubmitButton idleLabel="Publish Ride Entry" pendingLabel="Publishing..." />
    </form>
  );
}
