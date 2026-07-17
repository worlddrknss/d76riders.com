"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { clearHazardAction } from "@/app/(site)/roads/hazard-actions";
import { HAZARD_META, hazardAge } from "@/lib/hazards";
import type { HazardType } from "@prisma/client";

export type HazardListItem = {
  id: string;
  type: HazardType;
  description: string | null;
  createdAt: string; // ISO — serialized for the client boundary
  reporterName: string;
  reporterHandle: string | null;
  canClear: boolean;
};

export function HazardList({ hazards }: { hazards: HazardListItem[] }) {
  if (hazards.length === 0) {
    return <p className="text-sm text-muted">No active hazards. Clear road, as far as anyone has reported.</p>;
  }
  return (
    <ul className="space-y-2">
      {hazards.map((h) => (
        <HazardRow key={h.id} hazard={h} />
      ))}
    </ul>
  );
}

function HazardRow({ hazard }: { hazard: HazardListItem }) {
  const meta = HAZARD_META[hazard.type];
  const [cleared, setCleared] = useState(false);
  const [pending, start] = useTransition();

  if (cleared) return null;

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: meta.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-ink">{meta.label}</span>
          <span className="text-xs text-muted">
            {hazardAge(new Date(hazard.createdAt))} ·{" "}
            {hazard.reporterHandle ? `@${hazard.reporterHandle}` : hazard.reporterName}
          </span>
        </div>
        {hazard.description ? <p className="mt-0.5 text-sm text-muted">{hazard.description}</p> : null}
      </div>
      {hazard.canClear ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await clearHazardAction(hazard.id);
              if (!res.error) setCleared(true);
            })
          }
          title="Mark this hazard cleared"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted transition hover:border-forest/50 hover:text-forest disabled:opacity-50"
        >
          {pending ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          Clear
        </button>
      ) : null}
    </li>
  );
}
