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

export function GearTabbedView({ sections, items, createAction, updateAction, deleteAction }: GearTabbedViewProps) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? "");
  const [editingItem, setEditingItem] = useState<GearItem | null>(null);
  const [createPending, startCreateTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  const activeSection = sections.find((s) => s.key === activeTab);
  const activeItems = items.filter((i) => i.category === activeTab);
  const ActiveIcon = iconMap[activeSection?.iconKey ?? ""] ?? Package;

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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 shadow-soft">
        {sections.map((section) => {
          const Icon = iconMap[section.iconKey] ?? Package;
          const count = items.filter((i) => i.category === section.key).length;
          const isActive = activeTab === section.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveTab(section.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-sunset text-white shadow-sm"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{section.label}</span>
              {count > 0 && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-canvas text-asphalt"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active category content */}
      {activeSection && (
        <div className="rounded-xl border border-border bg-surface shadow-soft">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sunset/10 text-sunset">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">{activeSection.label}</h2>
                <p className="text-xs text-muted">{activeSection.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-asphalt">{activeItems.length} {activeItems.length === 1 ? "item" : "items"}</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="accent" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add {activeSection.label.replace(/s$/, "")}</DialogTitle>
                  </DialogHeader>
                  <GearItemForm categoryKey={activeTab} onSubmit={handleCreate} pending={createPending} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Items */}
          <div className="p-4">
            {activeItems.length === 0 ? (
              <div className="py-8 text-center">
                <ActiveIcon className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-3 text-sm text-muted">No {activeSection.label.toLowerCase()} yet</p>
                <p className="mt-1 text-xs text-muted">Click &quot;Add&quot; above to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeItems.map((item) => (
                  <div key={item.id} className="group relative rounded-lg border border-border bg-canvas p-4 transition hover:border-sunset/30 hover:shadow-sm">
                    {/* Edit/Delete icons */}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => setEditingItem(item)} className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-sunset" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} disabled={deletePending} className="rounded p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="pr-14 text-sm font-semibold text-ink">{item.name}</p>
                    {(item.brand || item.model) ? (
                      <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(" ")}</p>
                    ) : null}
                    {(item.size || item.color || item.condition) ? (
                      <p className="mt-1 text-xs text-muted">
                        {[item.size && `Size ${item.size}`, item.color, item.condition].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {item.purchaseDate ? (
                      <p className="mt-0.5 text-xs text-muted">Purchased {formatDate(item.purchaseDate)}</p>
                    ) : null}
                    {item.notes ? <p className="mt-1 text-xs italic text-muted">{item.notes}</p> : null}
                    {item.purchaseUrl ? (
                      <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
                        <ExternalLink className="h-3 w-3" /> Buy this
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit dialog */}
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
    </div>
  );
}
