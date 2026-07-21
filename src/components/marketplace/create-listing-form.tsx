"use client";

import { useActionState } from "react";

import { createListingAction, type ListingFormState } from "@/app/(site)/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: ListingFormState = { error: null };

const CATEGORIES = [
  { value: "BIKE", label: "Bike" },
  { value: "PARTS", label: "Parts" },
  { value: "GEAR", label: "Gear" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For parts" },
];

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

export function CreateListingForm() {
  const [state, formAction] = useActionState<ListingFormState, FormData>(createListingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="l-title" className={labelClass}>Title</label>
        <Input id="l-title" name="title" required maxLength={120} placeholder="2019 Kawasaki Z650 — clean title" className="mt-1" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="l-category" className={labelClass}>Category</label>
          <select id="l-category" name="category" required defaultValue="" className={selectClass}>
            <option value="" disabled>Choose…</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="l-condition" className={labelClass}>Condition</label>
          <select id="l-condition" name="condition" defaultValue="GOOD" className={selectClass}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="l-price" className={labelClass}>Price (USD)</label>
          <Input id="l-price" name="price" inputMode="decimal" placeholder="0 = make offer" className="mt-1" />
        </div>
        <div>
          <label htmlFor="l-location" className={labelClass}>
            Location <span className="normal-case text-muted/70">(optional)</span>
          </label>
          <Input id="l-location" name="location" maxLength={120} placeholder="Clarksville, TN" className="mt-1" />
        </div>
      </div>

      <div>
        <label htmlFor="l-desc" className={labelClass}>Description</label>
        <Textarea id="l-desc" name="description" rows={5} required maxLength={4000} placeholder="Condition, mileage, mods, why you're selling, and how to reach you." className="mt-1" />
      </div>

      <div>
        <label htmlFor="l-photos" className={labelClass}>Photos <span className="normal-case text-muted/70">(up to 6)</span></label>
        <input
          id="l-photos"
          name="photos"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="accent">Post listing</Button>
      </div>
    </form>
  );
}
