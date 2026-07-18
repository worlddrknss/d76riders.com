"use client";

import { useTransition } from "react";

import { toggleAmbassadorAction } from "@/app/(site)/r/ambassador-actions";

/** Admin-only control shown on a profile to grant/remove Ambassador status. */
export function AmbassadorToggle({ handle, isAmbassador }: { handle: string; isAmbassador: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await toggleAmbassadorAction(handle, !isAmbassador); })}
      className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted transition hover:border-sunset hover:text-sunset disabled:opacity-50"
    >
      {pending ? "…" : isAmbassador ? "Remove ambassador" : "Make ambassador"}
    </button>
  );
}
