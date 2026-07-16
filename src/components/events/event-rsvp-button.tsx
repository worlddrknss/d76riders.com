"use client";

import { useState, useTransition } from "react";
import { Clock, UserCheck, UserPlus } from "lucide-react";

import { rsvpAction } from "@/app/(site)/events/[slug]/actions";
import { Button } from "@/components/ui/button";

type RsvpButtonProps = {
  eventId: string;
  currentRsvp: "GOING" | "WAITLISTED" | null;
  attendeeCount: number;
  waitlistCount: number;
  capacity: number | null;
  capacityFull: boolean;
  rsvpClosed: boolean;
  rsvpDeadline: string | null;
  isLoggedIn: boolean;
};

export function EventRsvpButton({
  eventId,
  currentRsvp,
  attendeeCount,
  waitlistCount,
  capacity,
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

  const isGoing = currentRsvp === "GOING";
  const isWaitlisted = currentRsvp === "WAITLISTED";
  const registeredLabel = capacity != null ? `${attendeeCount} / ${capacity}` : `${attendeeCount}`;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <UserCheck className="h-4 w-4 text-sunset" />
          <span className="font-semibold text-ink">{registeredLabel}</span>
          <span>registered</span>
          {waitlistCount > 0 && <span className="text-xs">· {waitlistCount} waitlisted</span>}
        </div>

        {isLoggedIn && (
          <>
            {isGoing ? (
              <Button variant="outline" size="sm" onClick={() => handleRsvp("CANCEL")} disabled={pending} className="gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                {pending ? "Updating…" : "Registered ✓"}
              </Button>
            ) : isWaitlisted ? (
              <Button variant="outline" size="sm" onClick={() => handleRsvp("CANCEL")} disabled={pending} className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {pending ? "Updating…" : "On Waitlist"}
              </Button>
            ) : rsvpClosed ? (
              <Button variant="outline" size="sm" disabled className="gap-1.5">
                RSVPs Closed
              </Button>
            ) : capacityFull ? (
              <Button variant="accent" size="sm" onClick={() => handleRsvp("GOING")} disabled={pending} className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {pending ? "Joining…" : "Join Waitlist"}
              </Button>
            ) : (
              <Button variant="accent" size="sm" onClick={() => handleRsvp("GOING")} disabled={pending} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                {pending ? "Registering…" : "Register"}
              </Button>
            )}
          </>
        )}
      </div>

      {rsvpDeadline && !isGoing && !isWaitlisted && !rsvpClosed && (
        <p className="text-xs text-muted">RSVP by {rsvpDeadline}</p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
