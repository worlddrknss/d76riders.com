import { CalendarDays, Gauge, MapPin, Users } from "lucide-react";
import type { EventItem } from "@/types/community";
import { CardShell } from "@/components/ui/card-shell";

interface EventCardProps {
  event: EventItem;
  includeRsvp?: boolean;
}

export function EventCard({ event, includeRsvp = false }: EventCardProps) {
  return (
    <CardShell>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{event.level}</p>
      <h3 className="mt-2 font-display text-2xl tracking-tight text-asphalt">{event.title}</h3>
      <p className="mt-3 text-sm text-muted">{event.details}</p>
      <div className="mt-4 grid gap-2 text-sm text-muted">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {event.date}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          {event.location}
        </p>
        <p className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-slate-400" />
          {event.distance} • {event.level}
        </p>
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          {event.ridersGoing} riders going
        </p>
      </div>
      {includeRsvp ? (
        <button type="button" className="mt-5 rounded-full bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          RSVP
        </button>
      ) : null}
    </CardShell>
  );
}
