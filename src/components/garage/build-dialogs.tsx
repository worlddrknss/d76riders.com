"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Receipt, Wrench } from "lucide-react";

import {
  addBikePhotoAction,
  createModificationAction,
  createServiceRecordAction,
} from "@/app/(site)/garage/mine/actions";
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

const MOD_CATEGORIES: [string, string][] = [
  ["EXHAUST", "Exhaust"],
  ["PERFORMANCE", "Performance"],
  ["ENGINE", "Engine"],
  ["SUSPENSION", "Suspension"],
  ["EXTERIOR", "Exterior"],
  ["WHEELS_TIRES", "Wheels & Tires"],
  ["LIGHTING", "Lighting"],
  ["ELECTRICAL", "Electrical"],
  ["PROTECTION", "Protection & Crash"],
  ["ERGONOMICS", "Ergonomics"],
  ["OTHER", "Other"],
];

const SERVICE_TYPES: [string, string][] = [
  ["MAINTENANCE", "Maintenance"],
  ["REPAIR", "Repair"],
  ["INSPECTION", "Inspection"],
  ["UPGRADE", "Upgrade"],
  ["OTHER", "Other"],
];

const selectClass =
  "w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none";

/** Shared: a dialog that runs a void server action then closes + refreshes. */
function useDialogAction() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function run(action: (fd: FormData) => Promise<void>) {
    return (formData: FormData) => {
      start(async () => {
        await action(formData);
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      });
    };
  }

  return { open, setOpen, pending, formRef, run };
}

export function AddModificationDialog({ bikeId }: { bikeId: string }) {
  const { open, setOpen, pending, formRef, run } = useDialogAction();

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-sunset" />
              Add Modification
            </DialogTitle>
            <DialogDescription>Log a new mod on this build.</DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={run(createModificationAction)} className="mt-2 space-y-3">
            <input type="hidden" name="bikeId" value={bikeId} />
            <Input name="title" required placeholder="Upgrade title" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="category" defaultValue="OTHER" className={selectClass}>
                {MOD_CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Input name="cost" type="number" step="0.01" min="0" placeholder="Cost ($)" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="mileage" type="number" min="0" placeholder="Mileage" />
              <Input name="installedAt" type="date" />
            </div>
            <Textarea name="notes" rows={3} placeholder="Notes (optional)" />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add Modification"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddServiceDialog({ bikeId }: { bikeId: string }) {
  const { open, setOpen, pending, formRef, run } = useDialogAction();

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-sunset" />
              Add Service Record
            </DialogTitle>
            <DialogDescription>Log maintenance, a repair, or an inspection.</DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={run(createServiceRecordAction)} className="mt-2 space-y-3">
            <input type="hidden" name="bikeId" value={bikeId} />
            <Input name="title" required placeholder="Service title" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="serviceType" defaultValue="MAINTENANCE" className={selectClass}>
                {SERVICE_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Input name="cost" type="number" step="0.01" min="0" placeholder="Cost ($)" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="mileage" type="number" min="0" placeholder="Mileage" />
              <Input name="servicedAt" type="date" />
            </div>
            <Textarea name="notes" rows={3} placeholder="Notes (optional)" />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddBikePhotoDialog({ bikeId }: { bikeId: string }) {
  const { open, setOpen, pending, formRef, run } = useDialogAction();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Camera className="h-4 w-4" />
        Add photo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-sunset" />
              Add Build Photo
            </DialogTitle>
          </DialogHeader>

          <form ref={formRef} action={run(addBikePhotoAction)} className="mt-2 space-y-3">
            <input type="hidden" name="bikeId" value={bikeId} />
            <Input name="caption" placeholder="Caption (optional)" />
            <input
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
