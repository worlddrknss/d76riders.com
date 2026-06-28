import { MapPin, Route, Users } from "lucide-react";
import type { Ride } from "@/types/community";
import { CardShell } from "@/components/ui/card-shell";

interface RideCardProps {
  ride: Ride;
}

export function RideCard({ ride }: RideCardProps) {
  return (
    <CardShell>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{ride.when}</p>
      <h3 className="mt-2 font-display text-2xl tracking-tight text-asphalt">{ride.title}</h3>
      <div className="mt-4 grid gap-2 text-sm text-muted">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          {ride.location}
        </p>
        <p className="flex items-center gap-2">
          <Route className="h-4 w-4 text-slate-400" />
          {ride.distance} • {ride.difficulty}
        </p>
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          {ride.ridersGoing} riders going
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border bg-canvas px-3 py-1 uppercase tracking-[0.07em] text-slate-600">{ride.distance}</span>
        <span className="rounded-full border border-sunset/30 bg-sunset/10 px-3 py-1 uppercase tracking-[0.07em] text-sunset">{ride.difficulty}</span>
        <span className="rounded-full border border-border bg-canvas px-3 py-1 uppercase tracking-[0.07em] text-slate-600">{ride.ridersGoing} going</span>
      </div>
    </CardShell>
  );
}
