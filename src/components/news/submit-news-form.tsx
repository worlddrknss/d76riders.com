"use client";

import { useActionState, useMemo, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { submitNewsAction, type SubmitNewsFormState } from "@/app/(site)/magazine/new/actions";
import { ArticlePreview } from "@/components/news/article-preview";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

const initialState: SubmitNewsFormState = { error: null };

type SubmitNewsFormProps = {
  categories: { id: string; name: string }[];
  existingTags: string[];
  /** Drop the in-form title when a surrounding shell (e.g. the modal) supplies it. */
  hideHeading?: boolean;
  /**
   * Two-column composer with a live preview and a pinned footer, for the
   * full-screen modal. The plain page keeps the single column.
   */
  withPreview?: boolean;
  authorName?: string;
  authorAvatarUrl?: string | null;
};

export function SubmitNewsForm({
  categories,
  existingTags,
  hideHeading = false,
  withPreview = false,
  authorName = "You",
  authorAvatarUrl = null,
}: SubmitNewsFormProps) {
  const [contentHtml, setContentHtml] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [state, formAction] = useActionState(submitNewsAction, initialState);

  const wordCount = useMemo(() => {
    const plainText = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plainText ? plainText.split(" ").length : 0;
  }, [contentHtml]);

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.1em] text-muted";

  function pickCover(file: File | undefined) {
    setCoverUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setCoverName(file?.name ?? null);
  }

  const fields = (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className={labelClass}>Title</span>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none"
          placeholder="Article title"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>Category</span>
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-sunset/70 focus:outline-none"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Tags</span>
          <input
            name="tags"
            list="news-tags-list"
            className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none"
            placeholder="Safety, Touring, Community"
          />
          {existingTags.length > 0 ? (
            <datalist id="news-tags-list">
              {existingTags.map((tag) => <option key={tag} value={tag} />)}
            </datalist>
          ) : null}
        </label>
      </div>

      <label className="grid gap-2">
        <span className={labelClass}>Excerpt</span>
        <textarea
          name="excerpt"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset/70 focus:outline-none"
          placeholder="Short summary shown on the magazine listing and in link previews"
          required
        />
      </label>

      <div className="grid gap-2">
        <span className={labelClass}>Cover image (optional)</span>
        <label
          htmlFor="news-cover"
          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-muted transition hover:border-sunset/50 hover:text-sunset"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm font-semibold">{coverName ? "Choose a different photo" : "Add a cover photo"}</span>
          <span className="text-xs">JPG, PNG or WebP</span>
        </label>
        <input
          id="news-cover"
          name="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => pickCover(e.target.files?.[0])}
        />
        {coverName ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="truncate">{coverName}</span>
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("news-cover") as HTMLInputElement | null;
                if (input) input.value = "";
                pickCover(undefined);
              }}
              className="inline-flex shrink-0 items-center gap-1 text-red-600 transition hover:underline"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </p>
        ) : null}
      </div>

      <div>
        <p className={`mb-2 ${labelClass}`}>Body</p>
        <WysiwygEditor value={contentHtml} onChange={setContentHtml} placeholder="Write your article..." />
        <input type="hidden" name="contentHtml" value={contentHtml} />
      </div>
    </div>
  );

  const errorEl = state.error ? (
    <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{state.error}</p>
  ) : null;

  const preview = (
    <ArticlePreview
      title={title}
      categoryName={categoryName}
      contentHtml={contentHtml}
      coverUrl={coverUrl}
      authorName={authorName}
      authorAvatarUrl={authorAvatarUrl}
    />
  );

  // Single-column page version.
  if (!withPreview) {
    return (
      <form action={formAction} className="space-y-6">
        <div>
          {hideHeading ? null : <h1 className="font-display text-3xl text-asphalt">Submit an Article</h1>}
          <p className={`${hideHeading ? "" : "mt-2 "}text-sm text-muted`}>
            Share news, ride reports, or gear reviews with the District 76 community. Your article will be
            reviewed by a moderator before being published.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">{fields}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{wordCount} words</p>
          <button
            type="submit"
            className="rounded-lg bg-sunset px-6 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85"
          >
            Submit for Review
          </button>
        </div>
        {errorEl}
      </form>
    );
  }

  // Two-column composer + pinned footer — matches the event and road modals.
  return (
    <form action={formAction} className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-5">
            <p className="text-sm text-muted">
              Share news, ride reports, or gear reviews with the community. Your article is reviewed by a
              moderator before it goes public.
            </p>
            {fields}
            {errorEl}
          </div>
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
          <div className="mx-auto max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
            <div className="mt-3">{preview}</div>
            <p className="mt-3 text-xs text-muted">Roughly how it&apos;ll read once published.</p>
          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-xs text-muted">{wordCount} words</p>
          <button
            type="submit"
            className="rounded-lg bg-sunset px-6 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85"
          >
            Submit for Review
          </button>
        </div>
      </div>
    </form>
  );
}
