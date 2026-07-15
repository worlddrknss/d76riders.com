"use client";

import { useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";

import { checkInAction, checkOutAction } from "@/app/(site)/events/[slug]/actions";

type EventCheckInButtonProps = {
  eventId: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
};

export function EventCheckInButton({ eventId, isCheckedIn, isCheckedOut }: EventCheckInButtonProps) {
  const [pending, startTransition] = useTransition();

  if (isCheckedOut) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        <LogOut className="h-3.5 w-3.5" />
        Checked Out
      </span>
    );
  }

  if (isCheckedIn) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => checkOutAction(eventId))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt transition hover:border-asphalt disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {pending ? "Checking out…" : "Check Out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => checkInAction(eventId))}
      className="inline-flex items-center gap-1.5 rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
    >
      <LogIn className="h-3.5 w-3.5" />
      {pending ? "Checking in…" : "Check In"}
    </button>
  );
}
