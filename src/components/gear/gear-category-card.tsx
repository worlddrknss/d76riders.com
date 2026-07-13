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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat,
  Package,
  Shirt,
  Camera,
  Footprints,
};

type GearItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  purchaseDate: Date | null;
  purchaseUrl: string | null;
  notes: string | null;
};

type GearCategoryCardProps = {
  categoryKey: string;
  label: string;
  description: string;
  iconKey: string;
  items: GearItem[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (itemId: string, formData: FormData) => Promise<void>;
  deleteAction: (itemId: string) => Promise<void>;
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
  label?: string;
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
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : item ? "Update" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}

export function GearCategoryCard({
  categoryKey,
  label,
  description,
  iconKey,
  items,
  createAction,
  updateAction,
  deleteAction,
}: GearCategoryCardProps) {
  const Icon = iconMap[iconKey] ?? Package;
  const [createPending, startCreateTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<GearItem | null>(null);
  const router = useRouter();

  function handleCreate(formData: FormData) {
    startCreateTransition(async () => {
      await createAction(formData);
    });
  }

  function handleEdit(formData: FormData) {
    if (!editingItem) return;
    startEditTransition(async () => {
      await updateAction(editingItem.id, formData);
      setEditingItem(null);
      router.refresh();
    });
  }

  function handleDelete(itemId: string) {
    startDeleteTransition(async () => {
      await deleteAction(itemId);
    });
  }

  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sunset/10 text-sunset">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-canvas px-1.5 text-xs font-bold text-asphalt">
          {items.length}
        </span>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-border bg-canvas text-sunset hover:bg-sunset/10"
              title={`Add ${label.toLowerCase()}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add {label.replace(/s$/, "")}</DialogTitle>
            </DialogHeader>
            <GearItemForm categoryKey={categoryKey} label={label} onSubmit={handleCreate} pending={createPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 space-y-2 p-4">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">No {label.toLowerCase()} yet</p>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className="group rounded-lg border border-border bg-canvas px-3 py-2.5 transition hover:border-sunset/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                {(item.brand || item.model) ? (
                  <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(" ")}</p>
                ) : null}
                {(item.size || item.color || item.condition) ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {[item.size && `Size ${item.size}`, item.color, item.condition].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {item.purchaseDate ? (
                  <p className="mt-0.5 text-xs text-muted">Purchased {formatDate(item.purchaseDate)}</p>
                ) : null}
                {item.notes ? <p className="mt-1 text-xs italic text-muted">{item.notes}</p> : null}
                {item.purchaseUrl ? (
                  <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
                    <ExternalLink className="h-3 w-3" /> Buy this
                  </a>
                ) : null}
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="rounded p-1 text-muted transition hover:bg-canvas hover:text-sunset"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletePending}
                  className="rounded p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editingItem?.name}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <GearItemForm item={editingItem} categoryKey={categoryKey} label={label} onSubmit={handleEdit} pending={editPending} />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
