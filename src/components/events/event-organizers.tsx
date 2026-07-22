"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Shield, Crown } from "lucide-react";

import {
  addOrganizerAction,
  removeOrganizerAction,
  transferHostAction,
} from "@/app/(site)/events/[slug]/actions";
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
  const [showTransfer, setShowTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [transferPending, startTransferTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const transferFormRef = useRef<HTMLFormElement>(null);

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

  // Handing over the ride costs the current host their control of it, so it
  // asks first, naming who it's going to.
  function confirmAndTransfer(handle: string, label: string) {
    if (!window.confirm(`Make ${label} the host? You'll stay on as a ride lead.`)) return;
    startTransferTransition(async () => {
      const result = await transferHostAction(eventId, handle);
      setError(result.error);
      if (!result.error) {
        setShowTransfer(false);
        transferFormRef.current?.reset();
      }
    });
  }

  function handleTransferByHandle(formData: FormData) {
    const handle = (formData.get("handle")?.toString() ?? "").trim();
    if (!handle) return;
    confirmAndTransfer(handle, `@${handle}`);
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

      {/* Panel-level so a failure from the per-row "make host" button is visible
          even with both forms closed. */}
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

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
              <>
                <button
                  type="button"
                  disabled={transferPending}
                  onClick={() =>
                    confirmAndTransfer(org.rider.handle, `${org.rider.name} (@${org.rider.handle})`)
                  }
                  className="text-muted transition hover:text-sunset disabled:opacity-50"
                  title="Make host"
                >
                  <Crown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={removePending}
                  onClick={() => handleRemove(org.id)}
                  className="text-muted transition hover:text-red-500 disabled:opacity-50"
                  title="Remove organizer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
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

      {/* Handing off to someone already on staff is one click on their row; this
          covers handing off to a rider who isn't staff yet. */}
      {isHost && (
        <div className="mt-4 border-t border-border pt-4">
          {showTransfer ? (
            <form ref={transferFormRef} action={handleTransferByHandle} className="space-y-3">
              <div>
                <label htmlFor="transfer-handle" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Hand off to
                </label>
                <p className="mt-1 text-xs text-muted">
                  They take over managing this ride. You stay on as a ride lead.
                </p>
              </div>
              <Input id="transfer-handle" name="handle" placeholder="Rider handle (e.g. worlddrknss)" required />
              <div className="flex gap-2">
                <Button type="submit" variant="accent" size="sm" disabled={transferPending}>
                  {transferPending ? "Transferring…" : "Transfer Host"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowTransfer(false); setError(null); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => { setShowTransfer(true); setError(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-sunset"
            >
              <Crown className="h-3.5 w-3.5" />
              Transfer host to another rider
            </button>
          )}
        </div>
      )}
    </div>
  );
}
