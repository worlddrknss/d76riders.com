"use client";

import { useState } from "react";
import Link from "next/link";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type EventRider = {
  handle: string;
  name: string;
  avatarUrl: string | null;
};

function Avatar({ rider, size }: { rider: EventRider; size: "sm" | "md" }) {
  const cls = size === "sm" ? "h-7 w-7 text-[0.6rem]" : "h-9 w-9 text-sm";
  return rider.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={rider.avatarUrl} alt={rider.name} className={`${cls} shrink-0 rounded-full border border-border object-cover`} />
  ) : (
    <span className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full bg-sunset/10 font-bold text-sunset`}>
      {rider.name.charAt(0)}
    </span>
  );
}

/**
 * The going list, compact. It used to be a full-width grid of every rider — on
 * a busy ride that's a wall of cards nobody scrolls. Show the five most recent
 * in the rail; the rest are one tap away behind "Show all".
 */
export function EventRidersList({ riders }: { riders: EventRider[] }) {
  const [open, setOpen] = useState(false);
  if (riders.length === 0) return null;

  const preview = riders.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Going ({riders.length})</p>
        {riders.length > preview.length ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-sunset transition hover:underline"
          >
            Show all
          </button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {preview.map((rider) => (
          <li key={rider.handle}>
            <Link href={`/r/${rider.handle}`} className="group flex items-center gap-2.5">
              <Avatar rider={rider} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink group-hover:text-sunset">{rider.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Going ({riders.length})</DialogTitle>
          </DialogHeader>
          <ul className="mt-3 space-y-1">
            {riders.map((rider) => (
              <li key={rider.handle}>
                <Link
                  href={`/r/${rider.handle}`}
                  className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-canvas"
                >
                  <Avatar rider={rider} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink group-hover:text-sunset">{rider.name}</span>
                    <span className="block truncate text-xs text-muted">@{rider.handle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
