"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { updateBikeAction, deleteBikeAction } from "@/app/garage/mine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { mediaUrl } from "@/lib/media-url";

type BikeData = {
  id: string;
  name: string;
  make: string;
  model: string | null;
  year: number | null;
  type: string | null;
  engineType: string | null;
  displacement: string | null;
  photos: { url: string; caption: string | null }[];
};

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

export function BikeCard({ bike }: { bike: BikeData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const imageUrl = bike.photos[0]?.url ? mediaUrl(bike.photos[0].url) : null;

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateBikeAction(bike.id, formData);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteBikeAction(bike.id);
    });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift"
    >
      {/* Action icons — top-right, appear on hover */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} className="h-8 w-8 bg-white/80 backdrop-blur hover:bg-white">
          <Pencil className="h-3.5 w-3.5 text-asphalt" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 text-red-600 backdrop-blur hover:bg-white hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {bike.name}?</AlertDialogTitle>
              <AlertDialogDescription>This bike and its photo will be permanently removed from your garage.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Header */}
      <div className="bg-asphalt px-5 py-4">
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{bike.name}</h3>
        <p className="text-xs font-semibold uppercase tracking-widest text-sunset">Powered by {bike.make}</p>
      </div>

      {/* Bike Image */}
      <div className="flex items-center justify-center bg-canvas">
        {imageUrl ? (
          <img src={imageUrl} alt={bike.photos[0]?.caption || bike.name} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center text-muted">
            <svg className="h-20 w-20 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4.5 19.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0zM12.5 19.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Spec Row — Year | Type | Make */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border px-2 py-4">
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Year</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.year ?? "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Type</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.type ? bike.type.charAt(0) + bike.type.slice(1).toLowerCase() : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Make</p>
          <p className="mt-0.5 font-display text-sm font-bold text-asphalt">{bike.make}</p>
        </div>
      </div>

      {/* Spec Details */}
      <div className="grid grid-cols-2 border-t border-border">
        <div className="border-b border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Engine Type</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.engineType || "—"}</p>
        </div>
        <div className="border-b border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Model</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.model || "—"}</p>
        </div>
        <div className="border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Displacement</p>
          <p className="mt-0.5 text-sm font-medium text-asphalt">{bike.displacement || "—"}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Bike Name</p>
          <p className="mt-0.5 text-sm font-medium text-sunset">{bike.name}</p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {bike.name}</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleEdit} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Name</label>
                <Input name="name" defaultValue={bike.name} className="mt-1" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Make</label>
                <Input name="make" defaultValue={bike.make} className="mt-1" required />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Model</label>
                <Input name="model" defaultValue={bike.model ?? ""} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Year</label>
                <Input name="year" type="number" defaultValue={bike.year ?? undefined} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Type</label>
                <select name="type" defaultValue={bike.type ?? ""} className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                  {bikeTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Engine</label>
                <Input name="engineType" defaultValue={bike.engineType ?? ""} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Displacement</label>
              <Input name="displacement" defaultValue={bike.displacement ?? ""} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Replace Photo</label>
              <Input name="bikePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
            </div>
            {imageUrl && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input name="removePhoto" type="checkbox" className="rounded" />
                Remove current photo
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                {editPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}
