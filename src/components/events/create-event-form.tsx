"use client";

import { useActionState, useState } from "react";

import {
  createEventAction,
  type CreateEventFormState,
} from "@/app/(site)/events/new/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { EventRoutePlannerField } from "@/components/events/event-route-planner-field";

const initialCreateEventFormState: CreateEventFormState = {
  error: null,
};

export function CreateEventForm() {
  const [state, formAction] = useActionState<CreateEventFormState, FormData>(
    createEventAction,
    initialCreateEventFormState,
  );
  const [excerpt, setExcerpt] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Event Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Saturday Sunrise Loop"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={255}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Short summary shown on the events page."
        />
        <p className={`text-right text-xs ${excerpt.length > 255 ? "text-red-600" : "text-muted"}`}>
          {excerpt.length}/255
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          placeholder="Pace, safety notes, and what riders should expect."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="eventPhoto" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Event Photo
        </label>
        <input
          id="eventPhoto"
          name="eventPhoto"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="startsAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Event Start (Required)
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ksuAt" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            KSU Time (Optional)
          </label>
          <input
            id="ksuAt"
            name="ksuAt"
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="meetLocation" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Meetup Location
          </label>
          <input
            id="meetLocation"
            name="meetLocation"
            type="text"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="Clarksville Speedway Parking Lot"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ksuLocation" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            KSU Location
          </label>
          <input
            id="ksuLocation"
            name="ksuLocation"
            type="text"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="Exit ramp lot, Hwy 79"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="distanceMiles" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Distance (Miles)
          </label>
          <input
            id="distanceMiles"
            name="distanceMiles"
            type="number"
            min={1}
            step={1}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="80"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="difficulty" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue=""
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="SCENIC">Scenic</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-canvas/80 p-4">
        <h3 className="font-display text-lg font-semibold text-asphalt">Official Event Route (Optional)</h3>
        <p className="mt-1 text-sm text-muted">Launch the route planner to define the official route for this event.</p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="routeName" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Route Name
            </label>
            <input
              id="routeName"
              name="routeName"
              type="text"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
              placeholder="LBL Scenic Loop"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="routeDescription" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Route Description
            </label>
            <textarea
              id="routeDescription"
              name="routeDescription"
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
              placeholder="Fuel stop near mile 40, tighter corners after mile 50."
            />
          </div>

          <EventRoutePlannerField />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel="Create Event" pendingLabel="Creating Event..." />
    </form>
  );
}
