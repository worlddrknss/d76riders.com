"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Settings, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import {
  deleteBikeAction,
  updateBikeAction,
  setPrimaryBikeAction,
} from "@/app/(site)/garage/mine/actions";
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
  photos: { id: string; url: string; caption: string | null; createdAt: string | Date }[];
  modifications: {
    id: string;
    title: string;
    category: string;
    cost: number | null;
    mileage: number | null;
    notes: string | null;
    installedAt: string | Date;
  }[];
  serviceRecords: {
    id: string;
    title: string;
    serviceType: string;
    cost: number | null;
    mileage: number | null;
    notes: string | null;
    servicedAt: string | Date;
  }[];
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

export function BikeCard({ bike, isPrimary = false }: { bike: BikeData; isPrimary?: boolean }) {
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
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          href={`/builds/${bike.id}`}
          title="Open build — modifications & service"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/80 backdrop-blur hover:bg-white"
        >
          <Settings className="h-3.5 w-3.5 text-asphalt" />
        </Link>
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

      {/* Photo */}
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={bike.photos[0]?.caption || bike.name} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-canvas text-muted">
            <svg className="h-16 w-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4.5 19.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0zM12.5 19.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0z" />
            </svg>
          </div>
        )}
        {isPrimary && (
          <span className="absolute left-3 top-3 rounded-full bg-sunset px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-soft">Current</span>
        )}
      </div>

      {/* Body — clean: title, specs, latest service, links */}
      <div className="p-4">
        <h3 className="font-display text-lg font-bold text-ink">{bike.name}</h3>
        <p className="mt-0.5 text-xs text-muted">
          {[
            bike.type ? bike.type.charAt(0) + bike.type.slice(1).toLowerCase() : null,
            bike.displacement,
            bike.year,
          ]
            .filter(Boolean)
            .join(" · ") || bike.make}
        </p>

        {bike.serviceRecords[0] ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">{bike.serviceRecords[0].title}</span>
            <span className="shrink-0 text-xs text-muted">
              {bike.serviceRecords[0].mileage != null
                ? `${bike.serviceRecords[0].mileage.toLocaleString()} mi`
                : new Date(bike.serviceRecords[0].servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
          <Link href={`/builds/${bike.id}`} className="text-xs font-bold text-[#cf5a26] hover:underline">
            View build →
          </Link>
          {!isPrimary && (
            <form action={setPrimaryBikeAction.bind(null, bike.id)} className="ml-auto">
              <button type="submit" className="text-xs font-semibold text-muted transition hover:text-sunset">
                Set current
              </button>
            </form>
          )}
        </div>
      </div>


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
