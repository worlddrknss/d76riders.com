"use client";

import { useActionState } from "react";

import { type CategoryFormState } from "@/app/admin/news/categories/actions";

const initialState: CategoryFormState = { error: null };

type CategoryFormProps = {
  action: (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  heading: string;
  submitLabel: string;
  initialValues?: { name?: string; description?: string };
};

export function CategoryForm({ action, heading, submitLabel, initialValues }: CategoryFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Content</p>
        <h1 className="mt-2 font-display text-3xl text-white">{heading}</h1>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-white/10 bg-white/3 p-6 shadow-lg">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Name</span>
          <input name="name" defaultValue={initialValues?.name ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="e.g. Community" required />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Description (optional)</span>
          <input name="description" defaultValue={initialValues?.description ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Short description of this category" />
        </label>

        {state.error ? <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p> : null}

        <button type="submit" className="w-full rounded-lg bg-sunset px-3 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85">
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
