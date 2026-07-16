"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createCrewAction, type CrewFormState } from "@/app/(site)/crews/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: CrewFormState = { error: null, success: null };

export function CreateCrewDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<CrewFormState, FormData>(createCrewAction, initialState);

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Start a Crew
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start a Crew</DialogTitle>
          </DialogHeader>

          <p className="mt-1 text-sm text-muted">
            A crew is a group within District 76 for riders who ride like you do. You&apos;ll be its lead.
          </p>

          <form action={formAction} className="mt-4 space-y-4">
            <div>
              <label htmlFor="crew-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Crew Name
              </label>
              <Input id="crew-name" name="name" required maxLength={80} placeholder="Dual Sport" className="mt-1" />
            </div>

            <div>
              <label htmlFor="crew-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">
                What it&apos;s about
              </label>
              <Textarea
                id="crew-desc"
                name="description"
                rows={3}
                required
                maxLength={300}
                placeholder="Gravel, fire roads, and anything the pavement runs out on."
                className="mt-1"
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                name="open"
                defaultChecked
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                Anyone can join
                <span className="mt-0.5 block text-xs text-muted">
                  Uncheck to make it invite-only — then a lead adds riders.
                </span>
              </span>
            </label>

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
                Start Crew
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
