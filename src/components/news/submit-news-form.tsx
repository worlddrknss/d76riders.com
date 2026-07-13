"use client";

import { useActionState, useMemo, useState } from "react";

import { submitNewsAction, type SubmitNewsFormState } from "@/app/(site)/news/new/actions";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

const initialState: SubmitNewsFormState = { error: null };

type SubmitNewsFormProps = {
  categories: { id: string; name: string }[];
  existingTags: string[];
};

export function SubmitNewsForm({ categories, existingTags }: SubmitNewsFormProps) {
  const [contentHtml, setContentHtml] = useState("");
  const [state, formAction] = useActionState(submitNewsAction, initialState);

  const wordCount = useMemo(() => {
    const plainText = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plainText ? plainText.split(" ").length : 0;
  }, [contentHtml]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-asphalt">Submit an Article</h1>
        <p className="mt-2 text-sm text-muted">
          Share news, ride reports, or gear reviews with the District 76 community. Your article will be reviewed by a moderator before being published.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Title</span>
            <input name="title" className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none" placeholder="Article title" required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Category</span>
              <select name="categoryId" required className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-sunset/70 focus:outline-none">
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Tags</span>
              <input name="tags" list="news-tags-list" className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none" placeholder="Safety, Touring, Community" />
              {existingTags.length > 0 ? (
                <datalist id="news-tags-list">
                  {existingTags.map((tag) => <option key={tag} value={tag} />)}
                </datalist>
              ) : null}
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Excerpt</span>
            <textarea name="excerpt" rows={2} className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none" placeholder="Short summary shown on the news listing" required />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Cover Image (optional)</span>
            <input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-sunset file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Body</p>
            <WysiwygEditor value={contentHtml} onChange={setContentHtml} placeholder="Write your article..." />
            <input type="hidden" name="contentHtml" value={contentHtml} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{wordCount} words</p>
        <button type="submit" className="rounded-lg bg-sunset px-6 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85">
          Submit for Review
        </button>
      </div>

      {state.error ? <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{state.error}</p> : null}
    </form>
  );
}
