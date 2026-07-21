"use client";

import { useState, useTransition } from "react";
import { Clock, UserCheck, UserPlus } from "lucide-react";

import { rsvpAction } from "@/app/(site)/events/[slug]/actions";
import { Button } from "@/components/ui/button";

type RsvpButtonProps = {
  eventId: string;
  currentRsvp: "GOING" | "WAITLISTED" | null;
  capacityFull: boolean;
  rsvpClosed: boolean;
  rsvpDeadline: string | null;
  isLoggedIn: boolean;
};

/**
 * The RSVP action as a full-width button that sits in the event sidebar's button
 * stack. The "N registered" count it used to carry is now rendered by the page
 * as a static readout above the stack, so this is only the interactive control.
 */
export function EventRsvpButton({
  eventId,
  currentRsvp,
  capacityFull,
  rsvpClosed,
  rsvpDeadline,
  isLoggedIn,
}: RsvpButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRsvp(intent: "GOING" | "CANCEL") {
    setError(null);
    startTransition(async () => {
      const result = await rsvpAction(eventId, intent);
      if (result?.error) setError(result.error);
    });
  }

  if (!isLoggedIn) return null;

  const isGoing = currentRsvp === "GOING";
  const isWaitlisted = currentRsvp === "WAITLISTED";

  return (
    <div className="space-y-1.5">
      {isGoing ? (
        <Button variant="outline" onClick={() => handleRsvp("CANCEL")} disabled={pending} className="w-full gap-1.5">
          <UserCheck className="h-4 w-4" />
          {pending ? "Updating…" : "Registered ✓"}
        </Button>
      ) : isWaitlisted ? (
        <Button variant="outline" onClick={() => handleRsvp("CANCEL")} disabled={pending} className="w-full gap-1.5">
          <Clock className="h-4 w-4" />
          {pending ? "Updating…" : "On Waitlist"}
        </Button>
      ) : rsvpClosed ? (
        <Button variant="outline" disabled className="w-full gap-1.5">
          RSVPs Closed
        </Button>
      ) : capacityFull ? (
        <Button variant="accent" onClick={() => handleRsvp("GOING")} disabled={pending} className="w-full gap-1.5">
          <Clock className="h-4 w-4" />
          {pending ? "Joining…" : "Join Waitlist"}
        </Button>
      ) : (
        <Button variant="accent" onClick={() => handleRsvp("GOING")} disabled={pending} className="w-full gap-1.5">
          <UserPlus className="h-4 w-4" />
          {pending ? "Registering…" : "Register"}
        </Button>
      )}

      {rsvpDeadline && !isGoing && !isWaitlisted && !rsvpClosed && (
        <p className="text-center text-xs text-muted">RSVP by {rsvpDeadline}</p>
      )}
      {error && <p className="text-center text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
