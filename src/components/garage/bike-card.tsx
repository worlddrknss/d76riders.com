"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Settings, Trash2 } from "lucide-react";
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const imageUrl = bike.photos[0]?.url ? mediaUrl(bike.photos[0].url) : null;

  const timeline = [
    ...bike.photos.map((photo) => ({
      id: `photo-${photo.id}`,
      label: "Photo Uploaded",
      meta: photo.caption || "Build image",
      when: new Date(photo.createdAt),
      amount: null as number | null,
    })),
    ...bike.modifications.map((item) => ({
      id: `mod-${item.id}`,
      label: `Modification: ${item.title}`,
      meta: item.category.replaceAll("_", " "),
      when: new Date(item.installedAt),
      amount: item.cost,
    })),
    ...bike.serviceRecords.map((item) => ({
      id: `svc-${item.id}`,
      label: `Service: ${item.title}`,
      meta: item.serviceType.replaceAll("_", " "),
      when: new Date(item.servicedAt),
      amount: item.cost,
    })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

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
        <Button variant="ghost" size="icon" onClick={() => setDetailsOpen(true)} className="h-8 w-8 bg-white/80 backdrop-blur hover:bg-white" title="View build details">
          <Eye className="h-3.5 w-3.5 text-asphalt" />
        </Button>
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

      <div className="bg-asphalt px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{bike.name}</h3>
          {isPrimary && (
            <span className="rounded-full bg-sunset/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-sunset">Current</span>
          )}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sunset">Powered by {bike.make}</p>
      </div>

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

      <div className="grid grid-cols-2 border-t border-border">
        <div className="border-r border-border px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Mods</p>
          <p className="mt-0.5 font-display text-lg font-bold text-asphalt">{bike.modifications.length}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted">Services</p>
          <p className="mt-0.5 font-display text-lg font-bold text-asphalt">{bike.serviceRecords.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <Link href={`/garage/mine/${bike.id}`} className="text-xs font-semibold uppercase tracking-wide text-sunset hover:underline">
          Build Timeline
        </Link>
        {!isPrimary && (
          <form action={setPrimaryBikeAction.bind(null, bike.id)}>
            <button type="submit" className="text-xs font-semibold text-muted transition hover:text-sunset">
              Set as Current Ride
            </button>
          </form>
        )}
      </div>


      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bike.name} Build Details</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Gallery</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {bike.photos.length > 0 ? bike.photos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-lg border border-border bg-canvas">
                    <img src={mediaUrl(photo.url)} alt={photo.caption || bike.name} className="h-32 w-full object-cover" />
                    <figcaption className="truncate px-2 py-1 text-xs text-muted">{photo.caption || "No caption"}</figcaption>
                  </figure>
                )) : <p className="text-sm text-muted">No gallery photos.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Timeline</h3>
              <div className="mt-2 space-y-2">
                {timeline.length > 0 ? timeline.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
                    <p className="text-sm font-semibold text-ink">{entry.label}</p>
                    <p className="text-xs text-muted">{entry.meta}</p>
                    <p className="mt-1 text-xs text-muted">{entry.when.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    {entry.amount ? <p className="text-xs font-semibold text-asphalt">${entry.amount.toFixed(2)}</p> : null}
                  </article>
                )) : <p className="text-sm text-muted">No timeline entries yet.</p>}
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Modifications</h3>
              <div className="mt-2 space-y-2">
                {bike.modifications.length > 0 ? bike.modifications.map((item) => (
                  <article key={item.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-muted">{item.category.replaceAll("_", " ")} · {new Date(item.installedAt).toLocaleDateString("en-US")}</p>
                    {item.notes ? <p className="mt-1 text-xs text-muted">{item.notes}</p> : null}
                  </article>
                )) : <p className="text-sm text-muted">No modifications.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Service Records</h3>
              <div className="mt-2 space-y-2">
                {bike.serviceRecords.length > 0 ? bike.serviceRecords.map((item) => (
                  <article key={item.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-muted">{item.serviceType.replaceAll("_", " ")} · {new Date(item.servicedAt).toLocaleDateString("en-US")}</p>
                    {item.notes ? <p className="mt-1 text-xs text-muted">{item.notes}</p> : null}
                  </article>
                )) : <p className="text-sm text-muted">No service records.</p>}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

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
