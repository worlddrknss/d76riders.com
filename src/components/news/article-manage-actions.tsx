"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Pencil, X } from "lucide-react";

import { updateArticleAction, type EditArticleState } from "@/app/(site)/magazine/[id]/actions";
import { ArticlePreview } from "@/components/news/article-preview";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

const initialState: EditArticleState = { error: null };

type ArticleData = {
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  categoryId: string | null;
  coverImageUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
};

/**
 * Edit an article from its own page, in the same full-screen modal with a live
 * preview the event, road and journal composers use.
 *
 * Shown to the author or an administrator. Status, publish date and featured
 * are deliberately absent — those stay in /admin, so fixing a typo can't
 * accidentally publish or unpublish anything.
 */
export function ArticleManageActions({
  article,
  categories,
}: {
  article: ArticleData;
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateArticleAction.bind(null, article.slug),
    initialState,
  );

  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [contentHtml, setContentHtml] = useState(article.contentHtml);
  const [categoryId, setCategoryId] = useState(article.categoryId ?? "");
  const [newCoverUrl, setNewCoverUrl] = useState<string | null>(null);
  const [newCoverName, setNewCoverName] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  // Reseed each time the modal opens so a cancelled edit doesn't linger —
  // adjusted at render on the open change rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(article.title);
      setExcerpt(article.excerpt);
      setContentHtml(article.contentHtml);
      setCategoryId(article.categoryId ?? "");
      setNewCoverUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      setNewCoverName(null);
      setRemoveCover(false);
    }
  }

  // Shut the modal once the server confirms the save; the action already
  // revalidated, so the page underneath is the new version. Keyed on the state
  // object rather than `saved` alone, or reopening after a save would slam the
  // modal shut on the stale result.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.saved) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const wordCount = useMemo(() => {
    const plain = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain ? plain.split(" ").length : 0;
  }, [contentHtml]);

  function pickCover(file: File | undefined) {
    setNewCoverUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setNewCoverName(file?.name ?? null);
    if (file) setRemoveCover(false);
  }

  const previewCover = newCoverUrl ?? (removeCover ? null : article.coverImageUrl);
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.1em] text-muted";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="safe-pb fixed inset-0 z-60 flex flex-col bg-surface"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-article-title"
            >
              <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Magazine</p>
                  <h1 id="edit-article-title" className="font-display text-xl text-ink sm:text-2xl">
                    Edit Article
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-1 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <form action={formAction} className="flex h-full min-h-0 flex-col">
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
                    <div className="mx-auto max-w-2xl space-y-5">
                      <label className="grid gap-2">
                        <span className={labelClass}>Title</span>
                        <input
                          name="title"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-sunset/70 focus:outline-none"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={labelClass}>Category</span>
                        <select
                          name="categoryId"
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-sunset/70 focus:outline-none"
                        >
                          <option value="">Unchanged</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2">
                        <span className={labelClass}>Excerpt</span>
                        <textarea
                          name="excerpt"
                          rows={2}
                          required
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          className="rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-sunset/70 focus:outline-none"
                        />
                      </label>

                      <div className="grid gap-2">
                        <span className={labelClass}>Cover image</span>
                        <label
                          htmlFor="edit-news-cover"
                          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-muted transition hover:border-sunset/50 hover:text-sunset"
                        >
                          <ImagePlus className="h-6 w-6" />
                          <span className="text-sm font-semibold">
                            {newCoverName || article.coverImageUrl ? "Choose a different photo" : "Add a cover photo"}
                          </span>
                          <span className="text-xs">JPG, PNG or WebP</span>
                        </label>
                        <input
                          id="edit-news-cover"
                          name="coverImage"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => pickCover(e.target.files?.[0])}
                        />
                        {newCoverName ? (
                          <p className="text-xs text-muted">{newCoverName}</p>
                        ) : article.coverImageUrl ? (
                          <label className="flex items-center gap-2 text-xs text-muted">
                            <input
                              name="removeCoverImage"
                              type="checkbox"
                              checked={removeCover}
                              onChange={(e) => setRemoveCover(e.target.checked)}
                              className="rounded accent-sunset"
                            />
                            Remove the current cover
                          </label>
                        ) : null}
                      </div>

                      <div>
                        <p className={`mb-2 ${labelClass}`}>Body</p>
                        <WysiwygEditor value={contentHtml} onChange={setContentHtml} placeholder="Write your article..." />
                        <input type="hidden" name="contentHtml" value={contentHtml} />
                      </div>

                      {state.error ? (
                        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                          {state.error}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
                    <div className="mx-auto max-w-md">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
                      <div className="mt-3">
                        <ArticlePreview
                          title={title}
                          categoryName={categoryName}
                          contentHtml={contentHtml}
                          coverUrl={previewCover}
                          authorName={article.authorName}
                          authorAvatarUrl={article.authorAvatarUrl}
                        />
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
                  <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <p className="text-xs text-muted">{wordCount} words</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-sunset px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sunset/85 disabled:opacity-60"
                      >
                        {pending ? "Saving…" : "Save Article"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
