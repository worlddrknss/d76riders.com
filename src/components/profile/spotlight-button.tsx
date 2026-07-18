"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { setSpotlightAction } from "@/app/(site)/r/spotlight-actions";

/** Admin-only control to feature a rider as this week's Rider Spotlight. */
export function SpotlightButton({ handle }: { handle: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        start(async () => {
          await setSpotlightAction(handle);
          setDone(true);
        })
      }
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted transition hover:border-sunset hover:text-sunset disabled:opacity-50"
    >
      <Star className="h-3.5 w-3.5" />
      {pending ? "…" : done ? "Featured" : "Feature as Spotlight"}
    </button>
  );
}
