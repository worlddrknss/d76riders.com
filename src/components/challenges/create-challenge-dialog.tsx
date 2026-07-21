"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createChallengeAction, type ChallengeFormState } from "@/app/(site)/challenges/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: ChallengeFormState = { error: null, success: null };

type CreateChallengeDialogProps = {
  /** Crews this rider is in — you can only set a crew challenge for your own crew. */
  crews: { id: string; name: string }[];
};

export function CreateChallengeDialog({ crews }: CreateChallengeDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ChallengeFormState, FormData>(
    createChallengeAction,
    initialState,
  );

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Set a Challenge
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set a Challenge</DialogTitle>
          </DialogHeader>

          <p className="mt-1 text-sm text-muted">
            Only rides inside your window count toward it — that&apos;s what makes it a challenge rather than
            a badge. You&apos;re entered automatically.
          </p>

          <form action={formAction} className="mt-4 space-y-4">
            <div>
              <label htmlFor="ch-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Name
              </label>
              <Input id="ch-name" name="name" required maxLength={120} placeholder="500 Miles in July" className="mt-1" />
            </div>

            <div>
              <label htmlFor="ch-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">
                What it takes
              </label>
              <Textarea
                id="ch-desc"
                name="description"
                rows={2}
                maxLength={300}
                placeholder="Cover 500 miles on group rides before the month is out."
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ch-metric" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Measured on
                </label>
                <select
                  id="ch-metric"
                  name="metric"
                  defaultValue="MILES_RIDDEN"
                  className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
                >
                  <option value="MILES_RIDDEN">Miles ridden</option>
                  <option value="EVENTS_ATTENDED">Rides attended</option>
                  <option value="EVENTS_ORGANIZED">Rides organized</option>
                </select>
              </div>
              <div>
                <label htmlFor="ch-goal" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Goal
                </label>
                <Input id="ch-goal" name="goal" type="number" min={1} max={100000} required placeholder="500" className="mt-1" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ch-starts" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Starts
                </label>
                <Input id="ch-starts" name="startsAt" type="datetime-local" required className="mt-1" />
              </div>
              <div>
                <label htmlFor="ch-ends" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Ends
                </label>
                <Input id="ch-ends" name="endsAt" type="datetime-local" required className="mt-1" />
              </div>
            </div>

            {crews.length > 0 ? (
              <div>
                <label htmlFor="ch-crew" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Who it&apos;s for
                </label>
                <select
                  id="ch-crew"
                  name="crewId"
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
                >
                  <option value="">Open to everyone</option>
                  {crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name} only
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {state.error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Set Challenge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
