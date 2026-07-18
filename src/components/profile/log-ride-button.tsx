"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { logRideAction } from "@/app/(site)/r/ride-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LogRideButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function action(formData: FormData) {
    start(async () => {
      const result = await logRideAction({ error: null, success: false }, formData);
      if (result.success) {
        formRef.current?.reset();
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Log a ride
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log a ride</DialogTitle>
            <DialogDescription>
              Track a ride you took outside a group event. It counts toward your total rides and miles.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={action} className="mt-2 space-y-3">
            <div>
              <label htmlFor="lr-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Title <span className="normal-case text-muted/70">(optional)</span>
              </label>
              <Input id="lr-title" name="title" placeholder="Morning canyon loop" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lr-miles" className="text-xs font-semibold uppercase tracking-wide text-muted">Miles</label>
                <Input id="lr-miles" name="distanceMiles" type="number" min={1} max={100000} required placeholder="42" className="mt-1" />
              </div>
              <div>
                <label htmlFor="lr-date" className="text-xs font-semibold uppercase tracking-wide text-muted">Date</label>
                <Input id="lr-date" name="riddenAt" type="date" className="mt-1" />
              </div>
            </div>
            <div>
              <label htmlFor="lr-notes" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Notes <span className="normal-case text-muted/70">(optional)</span>
              </label>
              <Textarea id="lr-notes" name="notes" rows={2} placeholder="How was it?" className="mt-1" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Log ride"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
