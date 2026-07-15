"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Shield } from "lucide-react";

import { addOrganizerAction, removeOrganizerAction } from "@/app/(site)/events/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Organizer = {
  id: string;
  role: string;
  rider: { name: string; handle: string };
};

type EventOrganizersProps = {
  eventId: string;
  organizers: Organizer[];
  isHost: boolean;
};

const roleLabels: Record<string, string> = {
  HOST: "Host",
  LEAD: "Ride Lead",
  SWEEP: "Sweep",
  MARSHAL: "Marshal",
};

const roleColors: Record<string, string> = {
  HOST: "bg-sunset/10 text-sunset",
  LEAD: "bg-blue-50 text-blue-700",
  SWEEP: "bg-green-50 text-green-700",
  MARSHAL: "bg-purple-50 text-purple-700",
};

export function EventOrganizers({ eventId, organizers, isHost }: EventOrganizersProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    const handle = (formData.get("handle")?.toString() ?? "").trim();
    const role = (formData.get("role")?.toString() ?? "LEAD") as "LEAD" | "SWEEP" | "MARSHAL";
    if (!handle) return;

    startAddTransition(async () => {
      const result = await addOrganizerAction(eventId, handle, role);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setShowAdd(false);
        formRef.current?.reset();
      }
    });
  }

  function handleRemove(organizerId: string) {
    startRemoveTransition(async () => {
      await removeOrganizerAction(eventId, organizerId);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-asphalt">
          <Shield className="h-5 w-5 text-sunset" />
          Ride Staff
        </h2>
        {isHost && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {organizers.map((org) => (
          <div key={org.id} className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{org.rider.name}</p>
              <p className="text-xs text-muted">@{org.rider.handle}</p>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleColors[org.role] ?? "bg-canvas text-muted"}`}>
              {roleLabels[org.role] ?? org.role}
            </span>
            {isHost && org.role !== "HOST" && (
              <button
                type="button"
                disabled={removePending}
                onClick={() => handleRemove(org.id)}
                className="text-muted transition hover:text-red-500 disabled:opacity-50"
                title="Remove organizer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <form ref={formRef} action={handleAdd} className="mt-4 space-y-3 rounded-lg border border-dashed border-border bg-canvas p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input name="handle" placeholder="Rider handle (e.g. worlddrknss)" required />
            <select
              name="role"
              defaultValue="LEAD"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="LEAD">Ride Lead</option>
              <option value="SWEEP">Sweep</option>
              <option value="MARSHAL">Marshal</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={addPending}>
              {addPending ? "Adding…" : "Add Organizer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowAdd(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
