"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";

type GearAddFormProps = {
  gearSections: { key: string; label: string }[];
  createAction: (formData: FormData) => Promise<void>;
};

export function GearAddForm({ gearSections, createAction }: GearAddFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createAction(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-canvas/50"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-sunset" />
          <span className="text-sm font-semibold text-asphalt">Add Gear Item</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <form ref={formRef} action={handleSubmit} className="border-t border-border px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select name="category" required className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
              {gearSections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.label}
                </option>
              ))}
            </select>
            <input name="name" required placeholder="Item name *" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <input name="brand" placeholder="Brand" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <input name="model" placeholder="Model" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <input name="size" placeholder="Size / Fit" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <input name="color" placeholder="Color" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <input name="condition" placeholder="Condition (new, used…)" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-widest text-muted">Purchase Date</label>
              <input name="purchaseDate" type="date" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            </div>
            <textarea name="notes" rows={2} placeholder="Notes" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm sm:col-span-2 lg:col-span-1" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-sunset px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Item"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
