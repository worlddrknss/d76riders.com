"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, Flag, UserPlus } from "lucide-react";

import { manualCheckInAction, closeRideAction } from "@/app/(site)/events/[slug]/actions";
import { mediaUrl } from "@/lib/media-url";

type Attendee = {
  riderId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  checkIn: { checkInAt: string; checkOutAt: string | null } | null;
};

type AttendancePanelProps = {
  eventId: string;
  attendees: Attendee[];
  eventStatus: string;
};

export function AttendancePanel({ eventId, attendees, eventStatus }: AttendancePanelProps) {
  const [closePending, startCloseTransition] = useTransition();
  const checkedInCount = attendees.filter((a) => a.checkIn).length;
  const checkedOutCount = attendees.filter((a) => a.checkIn?.checkOutAt).length;
  const missingCheckout = attendees.filter((a) => a.checkIn && !a.checkIn.checkOutAt);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-asphalt">Attendance</h2>
          <p className="mt-1 text-sm text-muted">
            {checkedInCount}/{attendees.length} checked in
            {checkedOutCount > 0 ? ` · ${checkedOutCount} checked out` : ""}
          </p>
        </div>
        {eventStatus === "UPCOMING" && checkedInCount > 0 && (
          <button
            type="button"
            disabled={closePending}
            onClick={() => startCloseTransition(() => closeRideAction(eventId))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <Flag className="h-3.5 w-3.5" />
            {closePending ? "Closing…" : "Close Ride"}
          </button>
        )}
      </div>

      {missingCheckout.length > 0 && eventStatus === "COMPLETED" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {missingCheckout.length} rider{missingCheckout.length > 1 ? "s" : ""} checked in but didn&apos;t check out:{" "}
          {missingCheckout.map((a) => a.name).join(", ")}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {attendees.map((attendee) => (
          <AttendeeRow key={attendee.riderId} eventId={eventId} attendee={attendee} />
        ))}
      </div>
    </div>
  );
}

function AttendeeRow({ eventId, attendee }: { eventId: string; attendee: Attendee }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-3">
      {attendee.avatarUrl ? (
        <img src={mediaUrl(attendee.avatarUrl)} alt={attendee.name} className="h-8 w-8 rounded-full border border-border object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sunset/10 text-xs font-bold text-sunset">
          {attendee.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{attendee.name}</p>
        <p className="text-xs text-muted">@{attendee.handle}</p>
      </div>
      {attendee.checkIn ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {attendee.checkIn.checkOutAt ? "Out" : "In"}
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => manualCheckInAction(eventId, attendee.riderId))}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition hover:border-sunset hover:text-sunset disabled:opacity-50"
          title="Manual check-in"
        >
          <UserPlus className="h-3 w-3" />
          {pending ? "…" : "Check in"}
        </button>
      )}
    </div>
  );
}
