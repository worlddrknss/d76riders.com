"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Settings, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import {
  createModificationAction,
  createServiceRecordAction,
  deleteBikeAction,
  deleteModificationAction,
  deleteServiceRecordAction,
  updateBikeAction,
  updateModificationAction,
  updateServiceRecordAction,
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

export function BikeCard({ bike }: { bike: BikeData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"mods" | "services">("mods");
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [managePending, startManageTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const modificationFormRef = useRef<HTMLFormElement>(null);
  const serviceFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
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

  function handleCreateModification(formData: FormData) {
    startManageTransition(async () => {
      await createModificationAction(formData);
      modificationFormRef.current?.reset();
      router.refresh();
    });
  }

  function handleCreateService(formData: FormData) {
    startManageTransition(async () => {
      await createServiceRecordAction(formData);
      serviceFormRef.current?.reset();
      router.refresh();
    });
  }

  function handleDeleteModification(modificationId: string) {
    startManageTransition(async () => {
      await deleteModificationAction(modificationId);
      router.refresh();
    });
  }

  function handleDeleteService(serviceId: string) {
    startManageTransition(async () => {
      await deleteServiceRecordAction(serviceId);
      router.refresh();
    });
  }

  function handleUpdateModification(modId: string, formData: FormData) {
    startManageTransition(async () => {
      await updateModificationAction(modId, formData);
      setEditingModId(null);
      router.refresh();
    });
  }

  function handleUpdateService(serviceId: string, formData: FormData) {
    startManageTransition(async () => {
      await updateServiceRecordAction(serviceId, formData);
      setEditingServiceId(null);
      router.refresh();
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
        <Button variant="ghost" size="icon" onClick={() => {
          setManageTab("mods");
          setManageOpen(true);
        }} className="h-8 w-8 bg-white/80 backdrop-blur hover:bg-white" title="Manage modifications and service">
          <Settings className="h-3.5 w-3.5 text-asphalt" />
        </Button>
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
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{bike.name}</h3>
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

      <div className="border-t border-border px-5 py-3">
        <Link href={`/garage/mine/${bike.id}`} className="text-xs font-semibold uppercase tracking-wide text-sunset hover:underline">
          Manage Build Timeline and Service
        </Link>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage {bike.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="inline-flex rounded-lg border border-border bg-canvas p-1">
              <Button
                type="button"
                size="sm"
                variant={manageTab === "mods" ? "accent" : "ghost"}
                className="h-8 px-3"
                onClick={() => setManageTab("mods")}
              >
                Mods ({bike.modifications.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={manageTab === "services" ? "accent" : "ghost"}
                className="h-8 px-3"
                onClick={() => setManageTab("services")}
              >
                Service ({bike.serviceRecords.length})
              </Button>
            </div>

            {manageTab === "mods" ? (
            <div className="space-y-3 rounded-xl border border-border bg-canvas p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-asphalt">Add Modification</h3>
              <form ref={modificationFormRef} action={handleCreateModification} className="space-y-2">
                <input type="hidden" name="bikeId" value={bike.id} />
                <Input name="title" required placeholder="Title" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="category" className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                    <option value="OTHER">Category</option>
                    <option value="EXHAUST">Exhaust</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="ENGINE">Engine</option>
                    <option value="SUSPENSION">Suspension</option>
                    <option value="EXTERIOR">Exterior</option>
                    <option value="WHEELS_TIRES">Wheels &amp; Tires</option>
                    <option value="LIGHTING">Lighting</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="PROTECTION">Protection &amp; Crash</option>
                    <option value="ERGONOMICS">Ergonomics</option>
                  </select>
                  <Input name="cost" type="number" step="0.01" min="0" placeholder="Cost" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="mileage" type="number" min="0" placeholder="Mileage" />
                  <Input name="installedAt" type="date" />
                </div>
                <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
                <Button type="submit" size="sm" variant="accent" disabled={managePending}>{managePending ? "Saving…" : "Add Mod"}</Button>
              </form>

              <div className="space-y-2">
                {bike.modifications.length > 0 ? bike.modifications.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                    {editingModId === item.id ? (
                      <form action={(fd) => handleUpdateModification(item.id, fd)} className="space-y-2">
                        <Input name="title" defaultValue={item.title} required placeholder="Title" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select name="category" defaultValue={item.category} className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                            <option value="EXHAUST">Exhaust</option>
                            <option value="PERFORMANCE">Performance</option>
                            <option value="ENGINE">Engine</option>
                            <option value="SUSPENSION">Suspension</option>
                            <option value="EXTERIOR">Exterior</option>
                            <option value="WHEELS_TIRES">Wheels &amp; Tires</option>
                            <option value="LIGHTING">Lighting</option>
                            <option value="ELECTRICAL">Electrical</option>
                            <option value="PROTECTION">Protection &amp; Crash</option>
                            <option value="ERGONOMICS">Ergonomics</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <Input name="cost" type="number" step="0.01" defaultValue={item.cost ?? ""} placeholder="Cost" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input name="mileage" type="number" defaultValue={item.mileage ?? ""} placeholder="Mileage" />
                          <Input name="installedAt" type="date" defaultValue={new Date(item.installedAt).toISOString().slice(0, 10)} />
                        </div>
                        <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} placeholder="Notes" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" variant="accent" disabled={managePending}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingModId(null)}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">{item.title}</p>
                          <p className="text-xs text-muted">{item.category.replaceAll("_", " ")} · {new Date(item.installedAt).toLocaleDateString("en-US")}{item.cost ? ` · $${item.cost}` : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingModId(item.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDeleteModification(item.id)} disabled={managePending}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                )) : <p className="text-xs text-muted">No modifications yet.</p>}
              </div>
            </div>
            ) : (
            <div className="space-y-3 rounded-xl border border-border bg-canvas p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-asphalt">Add Service Record</h3>
              <form ref={serviceFormRef} action={handleCreateService} className="space-y-2">
                <input type="hidden" name="bikeId" value={bike.id} />
                <Input name="title" required placeholder="Service title" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="serviceType" className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REPAIR">Repair</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="UPGRADE">Upgrade</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <Input name="cost" type="number" step="0.01" min="0" placeholder="Cost" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="mileage" type="number" min="0" placeholder="Mileage" />
                  <Input name="servicedAt" type="date" />
                </div>
                <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
                <Button type="submit" size="sm" variant="accent" disabled={managePending}>{managePending ? "Saving…" : "Add Service"}</Button>
              </form>

              <div className="space-y-2">
                {bike.serviceRecords.length > 0 ? bike.serviceRecords.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                    {editingServiceId === item.id ? (
                      <form action={(fd) => handleUpdateService(item.id, fd)} className="space-y-2">
                        <Input name="title" defaultValue={item.title} required placeholder="Service title" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select name="serviceType" defaultValue={item.serviceType} className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="REPAIR">Repair</option>
                            <option value="INSPECTION">Inspection</option>
                            <option value="UPGRADE">Upgrade</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <Input name="cost" type="number" step="0.01" defaultValue={item.cost ?? ""} placeholder="Cost" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input name="mileage" type="number" defaultValue={item.mileage ?? ""} placeholder="Mileage" />
                          <Input name="servicedAt" type="date" defaultValue={new Date(item.servicedAt).toISOString().slice(0, 10)} />
                        </div>
                        <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} placeholder="Notes" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" variant="accent" disabled={managePending}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingServiceId(null)}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">{item.title}</p>
                          <p className="text-xs text-muted">{item.serviceType.replaceAll("_", " ")} · {new Date(item.servicedAt).toLocaleDateString("en-US")}{item.cost ? ` · $${item.cost}` : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingServiceId(item.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDeleteService(item.id)} disabled={managePending}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                )) : <p className="text-xs text-muted">No service records yet.</p>}
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
