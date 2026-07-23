"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, MapPin, Siren } from "lucide-react";

import { riderDownAction, resolveIncidentAction } from "@/app/(site)/events/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RosterRider = { riderId: string; name: string };

type Incident = {
  id: string;
  riderName: string;
  riderHandle: string;
  reportedByName: string;
  notes: string | null;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  resolvedAt: string | null;
  createdAt: string;
};

type RiderDownPanelProps = {
  eventId: string;
  roster: RosterRider[];
  incidents: Incident[];
};

export function RiderDownPanel({ eventId, roster, incidents }: RiderDownPanelProps) {
  const [open, setOpen] = useState(false);
  const activeIncidents = incidents.filter((i) => !i.resolvedAt);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-asphalt">
            <Siren className="h-5 w-5 text-red-600" />
            Safety
          </h2>
          <p className="mt-1 text-sm text-muted">
            Raise an alert if a rider goes down. All organizers are notified immediately.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5"
        >
          <AlertTriangle className="h-4 w-4" />
          Rider Down
        </Button>
      </div>

      {incidents.length > 0 && (
        <div className="mt-4 space-y-2">
          {incidents.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </div>
      )}
      {activeIncidents.length === 0 && incidents.length === 0 && (
        <p className="mt-4 text-xs text-muted">No incidents reported.</p>
      )}

      <RiderDownDialog
        eventId={eventId}
        roster={roster}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const resolved = !!incident.resolvedAt;
  const when = new Date(incident.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-lg border p-3 ${resolved ? "border-border bg-canvas" : "border-red-300 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {resolved ? "✓ " : "🚨 "}
            {incident.riderName}
          </p>
          <p className="text-xs text-muted">
            Reported by {incident.reportedByName} · {when}
          </p>
          {incident.notes && <p className="mt-1 text-sm text-asphalt">{incident.notes}</p>}
          {incident.locationText && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3" />
              {incident.locationText}
              {incident.lat != null && incident.lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${incident.lat},${incident.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-sunset underline"
                >
                  map
                </a>
              )}
            </p>
          )}
        </div>
        {!resolved && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await resolveIncidentAction(incident.id);
                router.refresh();
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-border bg-canvas px-2 py-1 text-xs font-medium text-muted transition hover:border-green-500 hover:text-green-600 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {pending ? "…" : "Resolve"}
          </button>
        )}
      </div>
    </div>
  );
}

function RiderDownDialog({
  eventId,
  roster,
  open,
  onOpenChange,
}: {
  eventId: string;
  roster: RosterRider[];
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [riderId, setRiderId] = useState("");
  const [notes, setNotes] = useState("");
  const [locationText, setLocationText] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setError(null);
      setRiderId("");
      setNotes("");
      setLocationText("");
      setCoords(null);
    }
    onOpenChange(value);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!locationText) {
          setLocationText(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setError("Couldn't get GPS location. Enter it manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function submit() {
    setError(null);
    if (!riderId) {
      setError("Select the affected rider.");
      return;
    }
    startTransition(async () => {
      const result = await riderDownAction(
        eventId,
        riderId,
        notes,
        locationText,
        coords?.lat ?? null,
        coords?.lng ?? null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Siren className="h-5 w-5" />
            Rider Down Alert
          </DialogTitle>
        </DialogHeader>
        <div className="mt-3 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Affected rider</label>
            {roster.length > 0 ? (
              <select
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
              >
                <option value="">Select a checked-in rider…</option>
                {roster.map((r) => (
                  <option key={r.riderId} value={r.riderId}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-muted">No checked-in riders to flag.</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Location</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Mile marker, cross street…"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={captureLocation} disabled={locating} className="shrink-0 gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {locating ? "…" : "GPS"}
              </Button>
            </div>
            {coords && (
              <p className="mt-1 text-xs text-green-600">
                GPS captured: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Condition, injuries, what's needed…"
              className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={submit} disabled={pending || roster.length === 0}>
              {pending ? "Sending…" : "Send Alert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
