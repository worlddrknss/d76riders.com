"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { type CreateNewsPostFormState } from "@/app/admin/content/new/actions";
import { createNewsPostAction } from "@/app/admin/content/new/actions";
import { deleteNewsPostFromAdminAction, updateNewsPostAction } from "@/app/admin/news/actions";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? `Edit: ${editingPost.title}` : "New Post"}</DialogTitle>
          </DialogHeader>
          <NewsPostForm
            action={formAction}
            contentHtml={contentHtml}
            onContentChange={setContentHtml}
            existingCategories={existingCategories}
            existingTags={existingTags}
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
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Inline form for dialog
type NewsPostFormProps = {
  action: (state: CreateNewsPostFormState, formData: FormData) => Promise<CreateNewsPostFormState>;
  contentHtml: string;
  onContentChange: (html: string) => void;
  existingCategories: string[];
  existingTags: string[];
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
};

function NewsPostForm({ action, contentHtml, onContentChange, existingCategories, existingTags, initialValues, onSuccess }: NewsPostFormProps) {
  const [state, formAction, pending] = useActionState<CreateNewsPostFormState, FormData>(action, initialFormState);

  // If no error and we had a submission, it means success
  // useEffect would be better but keeping it simple
  if (state && !state.error && state !== initialFormState) {
    // Next tick to avoid setState during render
    setTimeout(onSuccess, 0);
  }

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Title</span>
          <input name="title" defaultValue={initialValues?.title ?? ""} required className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Post title" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Category</span>
          <input name="category" defaultValue={initialValues?.category ?? ""} list="dlg-categories" required className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Community" />
        </label>
      </div>

      <datalist id="dlg-categories">
        {existingCategories.map((c) => <option key={c} value={c} />)}
      </datalist>
      <datalist id="dlg-tags">
        {existingTags.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tags</span>
          <input name="tags" defaultValue={initialValues?.tags ?? ""} list="dlg-tags" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Safety, Touring" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
          <select name="status" defaultValue={initialValues?.status ?? "PUBLISHED"} className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Excerpt</span>
        <textarea name="excerpt" rows={2} defaultValue={initialValues?.excerpt ?? ""} required className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Short summary" />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Body</p>
        <WysiwygEditor tone="admin" value={contentHtml} onChange={onContentChange} placeholder="Write your post…" />
        <input type="hidden" name="contentHtml" value={contentHtml} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Published At</span>
          <input name="publishedAt" type="datetime-local" defaultValue={initialValues?.publishedAt ?? ""} className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Image</span>
          <input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-sunset file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">SEO Title</span>
          <input name="seoTitle" defaultValue={initialValues?.seoTitle ?? ""} className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Optional" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">SEO Description</span>
          <input name="seoDescription" defaultValue={initialValues?.seoDescription ?? ""} className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" placeholder="Optional" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="featured" type="checkbox" defaultChecked={initialValues?.featured ?? false} className="h-4 w-4 rounded border-border" />
        Feature this post
      </label>

      {state.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : initialValues ? "Update Post" : "Publish Post"}
        </Button>
      </div>
    </form>
  );
}
