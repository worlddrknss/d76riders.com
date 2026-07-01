"use client";

import { useTransition } from "react";
import { UserCheck, UserPlus } from "lucide-react";

import { rsvpAction } from "@/app/events/[slug]/actions";
import { Button } from "@/components/ui/button";

type RsvpButtonProps = {
  eventId: string;
  currentRsvp: "GOING" | "INTERESTED" | null;
  attendeeCount: number;
  isLoggedIn: boolean;
};

export function EventRsvpButton({ eventId, currentRsvp, attendeeCount, isLoggedIn }: RsvpButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleRsvp(status: "GOING" | "CANCEL") {
    startTransition(async () => {
      await rsvpAction(eventId, status);
    });
  }

  const isGoing = currentRsvp === "GOING";

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <UserCheck className="h-4 w-4 text-sunset" />
        <span className="font-semibold text-ink">{attendeeCount}</span>
        <span>{attendeeCount === 1 ? "rider" : "riders"} registered</span>
      </div>

      {isLoggedIn && (
        <>
          {isGoing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRsvp("CANCEL")}
              disabled={pending}
              className="gap-1.5"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {pending ? "Updating…" : "Registered ✓"}
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleRsvp("GOING")}
              disabled={pending}
              className="gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {pending ? "Registering…" : "Register"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
