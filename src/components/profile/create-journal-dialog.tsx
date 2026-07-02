"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { createJournalEntryAction, type JournalFormState } from "@/app/(site)/riders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initial: JournalFormState = { error: null, success: null };

export function CreateJournalDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (_prev: JournalFormState, formData: FormData) => {
    const result = await createJournalEntryAction(_prev, formData);
    if (result.success) {
      setOpen(false);
      formRef.current?.reset();
    }
    return result;
  }, initial);

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        New Entry
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Ride Journal Entry</DialogTitle>
            <DialogDescription>Share a ride story with the community.</DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={action} className="mt-4 space-y-4">
            <div>
              <label htmlFor="create-title" className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
              <Input id="create-title" name="title" placeholder="Give it a name" className="mt-1" />
            </div>
            <div>
              <label htmlFor="create-body" className="text-xs font-semibold uppercase tracking-wide text-muted">Story</label>
              <Textarea id="create-body" name="body" rows={4} placeholder="How did the ride go?" className="mt-1" required />
            </div>
            <div>
              <label htmlFor="create-photo" className="text-xs font-semibold uppercase tracking-wide text-muted">Photo</label>
              <Input id="create-photo" name="ridePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
            </div>

            <AnimatePresence>
              {state.error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-red-600"
                >
                  {state.error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
