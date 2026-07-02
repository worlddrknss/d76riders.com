"use client";

import { useActionState, useMemo, useState } from "react";

import { type CreateNewsPostFormState } from "@/app/admin/content/new/actions";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

const initialCreateNewsPostFormState: CreateNewsPostFormState = {
  error: null,
};

type CreateNewsPostFormProps = {
  action: (_previousState: CreateNewsPostFormState, formData: FormData) => Promise<CreateNewsPostFormState>;
  initialValues?: {
    title?: string;
    category?: string;
    tags?: string;
    excerpt?: string;
    contentHtml?: string;
    status?: "DRAFT" | "PUBLISHED";
    publishedAt?: string;
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
  };
  heading: string;
  description: string;
  submitLabel: string;
};

export function CreateNewsPostForm({
  action,
  initialValues,
  heading,
  description,
  submitLabel,
}: CreateNewsPostFormProps) {
  const [contentHtml, setContentHtml] = useState(initialValues?.contentHtml ?? "<p>Kickoff notes for the next District 76 community ride...</p>");
  const [state, formAction] = useActionState<CreateNewsPostFormState, FormData>(
    action,
    initialCreateNewsPostFormState,
  );

  const wordCount = useMemo(() => {
    const plainText = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plainText ? plainText.split(" ").length : 0;
  }, [contentHtml]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Editor</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">{heading}</h1>
        <p className="mt-2 text-sm text-slate-300">{description}</p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Title</span>
            <input name="title" defaultValue={initialValues?.title ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Post title" required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Category</span>
              <input name="category" defaultValue={initialValues?.category ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Community" required />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Tags</span>
              <input name="tags" defaultValue={initialValues?.tags ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Safety, Touring, Community" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Excerpt</span>
            <textarea name="excerpt" defaultValue={initialValues?.excerpt ?? ""} rows={3} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Short summary for list cards" required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Status</span>
              <select name="status" defaultValue={initialValues?.status ?? "PUBLISHED"} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-sunset/70 focus:outline-none">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Published At</span>
              <input name="publishedAt" type="datetime-local" defaultValue={initialValues?.publishedAt ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-sunset/70 focus:outline-none" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">SEO Title</span>
              <input name="seoTitle" defaultValue={initialValues?.seoTitle ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Optional SEO title" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">SEO Description</span>
              <input name="seoDescription" defaultValue={initialValues?.seoDescription ?? ""} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Optional meta description" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input name="featured" type="checkbox" defaultChecked={initialValues?.featured ?? false} className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Feature this post
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Cover Image</span>
            <input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-sunset file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Body</p>
            <WysiwygEditor value={contentHtml} onChange={setContentHtml} placeholder="Share ride updates, route notes, and reminders..." />
            <input type="hidden" name="contentHtml" value={contentHtml} />
          </div>

          {state.error ? <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p> : null}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Publish</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Words</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-white">{wordCount}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Status</dt>
              <dd className="mt-1 text-sm font-semibold text-emerald-300">Publish Now</dd>
            </div>
          </dl>

          <button type="submit" className="mt-4 w-full rounded-lg bg-sunset px-3 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85">
            {submitLabel}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Preview</p>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="admin-preview prose prose-invert prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        </section>
      </aside>
    </form>
  );
}
