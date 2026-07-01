"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { createBikeAction, type GarageFormState } from "@/app/garage/mine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const bikeTypes = [
  { value: "", label: "Not specified" },
  { value: "NAKED", label: "Naked" },
  { value: "CRUISER", label: "Cruiser" },
  { value: "ADVENTURE", label: "Adventure" },
  { value: "SPORT", label: "Sport" },
  { value: "TOURING", label: "Touring" },
  { value: "STANDARD", label: "Standard" },
  { value: "OTHER", label: "Other" },
];

const initial: GarageFormState = { error: null, success: null };

export function CreateBikeDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (_prev: GarageFormState, formData: FormData) => {
    const result = await createBikeAction(_prev, formData);
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
        Add Bike
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Bike</DialogTitle>
            <DialogDescription>Add a new machine to your garage.</DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={action} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Name *</label>
                <Input name="name" placeholder="e.g. Street Triple" className="mt-1" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Make *</label>
                <Input name="make" placeholder="e.g. Triumph" className="mt-1" required />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Model</label>
                <Input name="model" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Year</label>
                <Input name="year" type="number" className="mt-1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Type</label>
                <select name="type" className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                  {bikeTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Engine</label>
                <Input name="engineType" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Displacement</label>
              <Input name="displacement" placeholder="e.g. 799cc" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Photo</label>
              <Input name="bikePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
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
                {pending ? "Adding…" : "Add Bike"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
