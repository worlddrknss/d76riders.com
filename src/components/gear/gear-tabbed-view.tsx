"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, Footprints, HardHat, Package, Pencil, Plus, Shirt, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { mediaUrl } from "@/lib/media-url";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Package, Shirt, Camera, Footprints,
};

type GearItem = {
  id: string;
  category: string;
  name: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  purchaseDate: Date | null;
  purchaseUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
};

type GearSection = {
  key: string;
  label: string;
  description: string;
  iconKey: string;
};

type GearTabbedViewProps = {
  sections: GearSection[];
  items: GearItem[];
  // When all three actions are supplied the viewer can edit (owner). Omit them
  // for the read-only public view — same layout, minus the CRUD controls.
  createAction?: (formData: FormData) => Promise<void>;
  updateAction?: (itemId: string, formData: FormData) => Promise<void>;
  deleteAction?: (itemId: string) => Promise<void>;
  emptyMessage?: string;
};

function formatDate(value: Date | null): string {
  if (!value) return "";
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function GearItemForm({ item, categoryKey, onSubmit, pending }: {
  item?: GearItem;
  categoryKey: string;
  onSubmit: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="mt-2 space-y-3">
      <input type="hidden" name="category" value={categoryKey} />
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Name *</label>
        <input name="name" required defaultValue={item?.name ?? ""} placeholder="e.g. Shoei RF-1400" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Brand</label>
          <input name="brand" defaultValue={item?.brand ?? ""} placeholder="Brand" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Model</label>
          <input name="model" defaultValue={item?.model ?? ""} placeholder="Model" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Size / Fit</label>
          <input name="size" defaultValue={item?.size ?? ""} placeholder="Size" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Color</label>
          <input name="color" defaultValue={item?.color ?? ""} placeholder="Color" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Condition</label>
          <input name="condition" defaultValue={item?.condition ?? ""} placeholder="New, Used…" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Purchase Date</label>
          <input name="purchaseDate" type="date" defaultValue={toDateInputValue(item?.purchaseDate ?? null)} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</label>
        <textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} placeholder="Notes" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Purchase Link (optional)</label>
        <input name="purchaseUrl" type="url" defaultValue={item?.purchaseUrl ?? ""} placeholder="https://..." className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">{item?.imageUrl ? "Replace Photo" : "Photo"}</label>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-asphalt file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
        {item?.imageUrl && (
          <label className="mt-1 flex items-center gap-2 text-xs text-muted">
            <input name="removeImage" type="checkbox" className="rounded" />
            Remove current photo
          </label>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : item ? "Update" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}

export function GearTabbedView({ sections, items, createAction, updateAction, deleteAction, emptyMessage }: GearTabbedViewProps) {
  const canEdit = Boolean(createAction && updateAction && deleteAction);
  const [editingItem, setEditingItem] = useState<GearItem | null>(null);
  const [createPending, startCreateTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  function handleCreate(formData: FormData) {
    if (!createAction) return;
    startCreateTransition(async () => {
      await createAction(formData);
    });
  }

  function handleEdit(formData: FormData) {
    if (!editingItem || !updateAction) return;
    startEditTransition(async () => {
      await updateAction(editingItem.id, formData);
      setEditingItem(null);
      router.refresh();
    });
  }

  function handleDelete(itemId: string) {
    if (!deleteAction) return;
    startDeleteTransition(async () => {
      await deleteAction(itemId);
    });
  }

  // Owners see every category (so they can add to empty ones); the public view
  // only shows categories that actually have gear.
  const visibleSections = canEdit ? sections : sections.filter((s) => items.some((i) => i.category === s.key));

  if (visibleSections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
        <Package className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">{emptyMessage ?? "No gear yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleSections.map((section) => {
        const sectionItems = items.filter((i) => i.category === section.key);
        const Icon = iconMap[section.iconKey] ?? Package;

        return (
          <section key={section.key} className="rounded-xl border border-border bg-surface shadow-soft">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sunset/10 text-sunset">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{section.label}</h3>
                  <p className="text-xs text-muted">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-canvas px-1.5 text-xs font-bold text-asphalt">
                  {sectionItems.length}
                </span>
                {canEdit && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg border border-border bg-canvas text-sunset hover:bg-sunset/10" title={`Add ${section.label.toLowerCase()}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add {section.label.replace(/s$/, "")}</DialogTitle>
                      </DialogHeader>
                      <GearItemForm categoryKey={section.key} onSubmit={handleCreate} pending={createPending} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Items */}
            {sectionItems.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-muted">No {section.label.toLowerCase()} yet</p>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {sectionItems.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-canvas transition hover:border-sunset/30 hover:shadow-sm">
                    {item.imageUrl && (
                      <div className="flex h-40 items-center justify-center bg-white p-2">
                        <img src={mediaUrl(item.imageUrl)} alt={item.name} className="max-h-full max-w-full object-contain" />
                      </div>
                    )}
                    <div className="p-4">
                    {canEdit && (
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => setEditingItem(item)} className="rounded bg-white/80 p-1.5 text-muted backdrop-blur transition hover:text-sunset" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} disabled={deletePending} className="rounded bg-white/80 p-1.5 text-muted backdrop-blur transition hover:text-red-600" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    {(item.brand || item.model) ? <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(" ")}</p> : null}
                    {(item.size || item.color || item.condition) ? (
                      <p className="mt-1 text-xs text-muted">{[item.size && `Size ${item.size}`, item.color, item.condition].filter(Boolean).join(" · ")}</p>
                    ) : null}
                    {item.purchaseDate ? <p className="mt-0.5 text-xs text-muted">Purchased {formatDate(item.purchaseDate)}</p> : null}
                    {item.notes ? <p className="mt-1 text-xs italic text-muted">{item.notes}</p> : null}
                    {item.purchaseUrl ? (
                      <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
                        <ExternalLink className="h-3 w-3" /> Buy this
                      </a>
                    ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Edit dialog */}
      {canEdit && (
        <Dialog open={editingItem !== null} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {editingItem?.name}</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <GearItemForm item={editingItem} categoryKey={editingItem.category} onSubmit={handleEdit} pending={editPending} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
