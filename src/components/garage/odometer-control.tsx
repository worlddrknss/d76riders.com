"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";

import { updateBikeMileageAction } from "@/app/(site)/garage/mine/actions";

/** Owner-only inline odometer editor — keeps a bike's mileage current so
 *  mileage-based maintenance reminders can trigger. */
export function OdometerControl({
  bikeId,
  currentMileage,
}: {
  bikeId: string;
  currentMileage: number | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={updateBikeMileageAction.bind(null, bikeId)}
        onSubmit={() => setEditing(false)}
        className="flex items-center gap-1.5"
      >
        <input
          name="mileage"
          type="number"
          min="0"
          defaultValue={currentMileage ?? ""}
          placeholder="Miles"
          autoFocus
          className="w-24 rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink focus:border-sunset focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-sunset px-2.5 py-1 text-xs font-semibold text-white">
          Save
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Update odometer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
    >
      <Gauge className="h-4 w-4 text-sunset" />
      {currentMileage != null ? `${currentMileage.toLocaleString("en-US")} mi` : "Set odometer"}
    </button>
  );
}
