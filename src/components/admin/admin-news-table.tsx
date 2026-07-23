"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ExternalLink, ImagePlus, Pencil, Plus, Star, Trash2, X } from "lucide-react";

import { type CreateNewsPostFormState } from "@/app/admin/content/new/actions";
import { createNewsPostAction } from "@/app/admin/content/new/actions";
import { deleteNewsPostFromAdminAction, updateNewsPostAction } from "@/app/admin/news/actions";
import { ArticlePreview } from "@/components/news/article-preview";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";
import { Button } from "@/components/ui/button";

type PostData = {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  category: string;
  authorName: string;
  authorHandle: string;
  excerpt: string;
  contentHtml: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  hasCoverImage: boolean;
  coverImageUrl: string | null;
};

type AdminNewsTableProps = {
  posts: PostData[];
  existingCategories: string[];
  existingTags: string[];
};

const initialFormState: CreateNewsPostFormState = { error: null };

function statusBadge(status: string) {
  const styles =
    status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-300"
    : status === "PENDING_REVIEW" ? "bg-amber-500/15 text-amber-300"
    : status === "REJECTED" ? "bg-red-500/15 text-red-300"
    : "bg-white/10 text-slate-300";
  const label = status === "PENDING_REVIEW" ? "Pending" : status;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles}`}>{label}</span>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminNewsTable({ posts, existingCategories, existingTags }: AdminNewsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const router = useRouter();

  const filteredPosts = useMemo(() => {
    if (statusFilter === "ALL") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  function openCreate() {
    setEditingPost(null);
    setContentHtml("<p></p>");
    setDialogOpen(true);
  }

  function openEdit(post: PostData) {
    setEditingPost(post);
    setContentHtml(post.contentHtml || "<p></p>");
    setDialogOpen(true);
  }

  function handleDelete(slug: string) {
    if (!confirm("Delete this post permanently?")) return;
    startDeleteTransition(async () => {
      await deleteNewsPostFromAdminAction(slug);
      router.refresh();
    });
  }

  const formAction = editingPost
    ? updateNewsPostAction.bind(null, editingPost.slug)
    : createNewsPostAction;

  return (
    <>
      {/* Filters + New button */}
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Filters</p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </div>
        <Button variant="accent" size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Post
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/3 shadow-lg">
        <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Author</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Updated</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No news posts match your filter.</td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {post.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      <span className="font-semibold text-white">{post.title.length > 35 ? `${post.title.slice(0, 35)}…` : post.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{post.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{post.authorHandle || post.authorName}</td>
                  <td className="px-4 py-3">{statusBadge(post.status)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(post.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <a href={`/magazine/${post.slug}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" title="View">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => openEdit(post)} className="rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(post.slug)} disabled={deletePending} className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Composer — the same full-screen modal with a live preview the site
          composers use, so an editor works against the article, not a form. */}
      {dialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="safe-pb fixed inset-0 z-60 flex flex-col bg-asphalt text-slate-100"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-news-composer-title"
            >
              <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 sm:px-8">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Publishing</p>
                  <h2 id="admin-news-composer-title" className="truncate font-display text-xl text-white sm:text-2xl">
                    {editingPost ? editingPost.title : "New Post"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  aria-label="Close"
                  className="-mr-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <NewsPostForm
                key={editingPost?.id ?? "new"}
                action={formAction}
                contentHtml={contentHtml}
                onContentChange={setContentHtml}
                existingCategories={existingCategories}
                existingTags={existingTags}
                existingCoverUrl={editingPost?.coverImageUrl ?? null}
                authorName={editingPost?.authorName ?? "District 76 Riders"}
                initialValues={editingPost ? {
                  title: editingPost.title,
                  category: editingPost.category,
                  tags: editingPost.tags,
                  excerpt: editingPost.excerpt,
                  contentHtml: editingPost.contentHtml,
                  status: editingPost.status as "DRAFT" | "PUBLISHED" | "PENDING_REVIEW",
                  publishedAt: editingPost.publishedAt?.slice(0, 16) ?? "",
                  seoTitle: editingPost.seoTitle,
                  seoDescription: editingPost.seoDescription,
                  featured: editingPost.featured,
                } : undefined}
                onSuccess={() => { setDialogOpen(false); router.refresh(); }}
                onCancel={() => setDialogOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

// Composer body, shared by create and edit.
type NewsPostFormProps = {
  action: (state: CreateNewsPostFormState, formData: FormData) => Promise<CreateNewsPostFormState>;
  contentHtml: string;
  onContentChange: (html: string) => void;
  existingCategories: string[];
  existingTags: string[];
  /** Cover already on the post, so the preview shows the article as it stands. */
  existingCoverUrl: string | null;
  authorName: string;
  initialValues?: {
    title?: string;
    category?: string;
    tags?: string;
    excerpt?: string;
    contentHtml?: string;
    status?: string;
    publishedAt?: string;
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
};

const fieldClass =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-[0.1em] text-slate-400";

function NewsPostForm({
  action,
  contentHtml,
  onContentChange,
  existingCategories,
  existingTags,
  existingCoverUrl,
  authorName,
  initialValues,
  onSuccess,
  onCancel,
}: NewsPostFormProps) {
  const [state, formAction, pending] = useActionState<CreateNewsPostFormState, FormData>(action, initialFormState);

  // Controlled only for the fields the preview reads; the rest stay uncontrolled.
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);

  // Close on a completed save, keyed on the state object rather than a flag —
  // the old version fired a setTimeout on every render that saw a clean state.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (!state.error) onSuccess();
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  const wordCount = useMemo(() => {
    const plain = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain ? plain.split(" ").length : 0;
  }, [contentHtml]);

  function pickCover(file: File | undefined) {
    setCoverUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setCoverName(file?.name ?? null);
  }

  return (
    <form action={formAction} className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={labelClass}>Title</span>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={fieldClass}
                  placeholder="Post title"
                />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>Category</span>
                <input
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="dlg-categories"
                  required
                  className={fieldClass}
                  placeholder="Community"
                />
              </label>
            </div>

            <datalist id="dlg-categories">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <datalist id="dlg-tags">
              {existingTags.map((tag) => <option key={tag} value={tag} />)}
            </datalist>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={labelClass}>Tags</span>
                <input name="tags" defaultValue={initialValues?.tags ?? ""} list="dlg-tags" className={fieldClass} placeholder="Safety, Touring" />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>Status</span>
                <select name="status" defaultValue={initialValues?.status ?? "PUBLISHED"} className={fieldClass}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className={labelClass}>Excerpt</span>
              <textarea
                name="excerpt"
                rows={2}
                defaultValue={initialValues?.excerpt ?? ""}
                required
                className={fieldClass}
                placeholder="Shown on the magazine listing and in link previews"
              />
            </label>

            <div className="grid gap-2">
              <span className={labelClass}>Cover Image</span>
              <label
                htmlFor="admin-news-cover"
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-slate-400 transition hover:border-sunset/50 hover:text-sunset"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-sm font-semibold">
                  {coverName || existingCoverUrl ? "Choose a different photo" : "Add a cover photo"}
                </span>
                <span className="text-xs">JPG, PNG or WebP</span>
              </label>
              <input
                id="admin-news-cover"
                name="coverImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => pickCover(e.target.files?.[0])}
              />
              {coverName ? <p className="text-xs text-slate-400">{coverName}</p> : null}
            </div>

            <div>
              <p className={`mb-2 ${labelClass}`}>Body</p>
              <WysiwygEditor tone="admin" value={contentHtml} onChange={onContentChange} placeholder="Write your post…" />
              <input type="hidden" name="contentHtml" value={contentHtml} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={labelClass}>Published At</span>
                <input name="publishedAt" type="datetime-local" defaultValue={initialValues?.publishedAt ?? ""} className={fieldClass} />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>SEO Title</span>
                <input name="seoTitle" defaultValue={initialValues?.seoTitle ?? ""} className={fieldClass} placeholder="Optional" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className={labelClass}>SEO Description</span>
              <input name="seoDescription" defaultValue={initialValues?.seoDescription ?? ""} className={fieldClass} placeholder="Optional" />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input name="featured" type="checkbox" defaultChecked={initialValues?.featured ?? false} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sunset" />
              Feature this post
            </label>

            {state.error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
            ) : null}
          </div>
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 bg-white/[0.02] px-5 py-6 sm:px-8 lg:block">
          <div className="mx-auto max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Preview</p>
            <div className="mt-3">
              <ArticlePreview
                title={title}
                categoryName={category}
                contentHtml={contentHtml}
                coverUrl={coverUrl ?? existingCoverUrl}
                authorName={authorName}
                authorAvatarUrl={null}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">Roughly how it reads on the site.</p>
          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-asphalt px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-xs text-slate-400">{wordCount} words</p>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white">
              Cancel
            </button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Saving…" : initialValues ? "Update Post" : "Publish Post"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
