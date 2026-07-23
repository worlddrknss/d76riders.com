"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImagePlus, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { type CreateNewsPostFormState } from "@/app/admin/content/new/actions";
import { createNewsPostAction } from "@/app/admin/content/new/actions";
import {
  bulkDeleteNewsPostsAction,
  bulkSetNewsFeaturedAction,
  bulkSetNewsStatusAction,
  deleteNewsPostFromAdminAction,
  updateNewsPostAction,
} from "@/app/admin/news/actions";
import { ArticlePreview } from "@/components/news/article-preview";
import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";
import {
  AdminComposer,
  AdminComposerBody,
  AdminComposerFooter,
  AdminFormError,
  adminField,
  adminLabel,
} from "@/components/admin/ui/admin-composer";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";
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
    status === "PUBLISHED" ? "border-forest/40 bg-forest/15 text-emerald-200"
    : status === "PENDING_REVIEW" ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
    : status === "REJECTED" ? "border-red-500/40 bg-red-500/10 text-red-300"
    : "border-white/15 bg-white/5 text-slate-300";
  const label = status === "PENDING_REVIEW" ? "Pending" : status;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${styles}`}>
      {label}
    </span>
  );
}

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";
const bulkButton =
  "rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminNewsTable({ posts, existingCategories, existingTags }: AdminNewsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [bulkPending, startBulkTransition] = useTransition();
  const router = useRouter();

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

  function runBulk(work: () => Promise<void>, clear: () => void) {
    startBulkTransition(async () => {
      await work();
      clear();
      router.refresh();
    });
  }

  const formAction = editingPost
    ? updateNewsPostAction.bind(null, editingPost.slug)
    : createNewsPostAction;

  const columns: AdminColumn<PostData>[] = [
    {
      key: "title",
      header: "Title",
      sortValue: (p) => p.title.toLowerCase(),
      searchValue: (p) => `${p.title} ${p.excerpt}`,
      cell: (post) => (
        <div className="flex items-center gap-1.5">
          {post.featured ? <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" /> : null}
          <span className="font-semibold text-white">{post.title}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (p) => p.category.toLowerCase(),
      searchValue: (p) => p.category,
      cell: (post) => post.category || "—",
    },
    {
      key: "author",
      header: "Author",
      sortValue: (p) => (p.authorHandle || p.authorName).toLowerCase(),
      searchValue: (p) => `${p.authorHandle} ${p.authorName}`,
      cell: (post) => post.authorHandle || post.authorName,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (post) => statusBadge(post.status),
    },
    {
      key: "published",
      header: "Published",
      sortValue: (p) => p.publishedAt ?? "",
      cell: (post) => <span className="text-slate-400">{formatDate(post.publishedAt)}</span>,
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (p) => p.updatedAt,
      cell: (post) => <span className="text-slate-400">{formatDate(post.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (post) => (
        <div className="flex items-center justify-end gap-1">
          <a
            href={`/magazine/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={iconButton}
            title="View on the site"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button onClick={() => openEdit(post)} className={iconButton} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <AdminConfirm
            title="Delete this article?"
            body={
              <>
                <span className="font-semibold text-white">{post.title}</span> and its cover image are
                removed for good. Any link to it starts returning a 404.
              </>
            }
            onConfirm={async () => {
              await deleteNewsPostFromAdminAction(post.slug);
              router.refresh();
            }}
            trigger={(open, pending) => (
              <button
                onClick={open}
                disabled={pending}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminDataTable
        rows={posts}
        columns={columns}
        rowKey={(post) => post.slug}
        searchPlaceholder="Search by title, author, or category…"
        emptyMessage="No articles yet. Write the first one."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING_REVIEW", label: "Pending Review" },
            ],
          },
          {
            key: "featured",
            label: "Featured",
            options: [
              { value: "YES", label: "Featured" },
              { value: "NO", label: "Not featured" },
            ],
          },
        ]}
        filterFn={(post, key, value) => {
          if (key === "status") return post.status === value;
          if (key === "featured") return value === "YES" ? post.featured : !post.featured;
          return true;
        }}
        toolbar={
          <Button variant="accent" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Post
          </Button>
        }
        bulkActions={(selected, clear) => {
          const slugs = selected.map((p) => p.slug);
          return (
            <>
              <button
                type="button"
                disabled={bulkPending}
                onClick={() => runBulk(() => bulkSetNewsStatusAction(slugs, "PUBLISHED"), clear)}
                className={bulkButton}
              >
                Publish
              </button>
              <button
                type="button"
                disabled={bulkPending}
                onClick={() => runBulk(() => bulkSetNewsStatusAction(slugs, "DRAFT"), clear)}
                className={bulkButton}
              >
                Unpublish
              </button>
              <button
                type="button"
                disabled={bulkPending}
                onClick={() => runBulk(() => bulkSetNewsFeaturedAction(slugs, true), clear)}
                className={bulkButton}
              >
                Feature
              </button>
              <button
                type="button"
                disabled={bulkPending}
                onClick={() => runBulk(() => bulkSetNewsFeaturedAction(slugs, false), clear)}
                className={bulkButton}
              >
                Unfeature
              </button>
              <AdminConfirm
                title={`Delete ${slugs.length} article${slugs.length === 1 ? "" : "s"}?`}
                confirmLabel={`Delete ${slugs.length}`}
                body="The articles and their cover images are removed for good. Any link to them starts returning a 404."
                onConfirm={() => runBulk(() => bulkDeleteNewsPostsAction(slugs), clear)}
                trigger={(open, pending) => (
                  <button
                    type="button"
                    onClick={open}
                    disabled={pending || bulkPending}
                    className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              />
            </>
          );
        }}
      />

      {/* Create and edit share one composer — the same full-screen shell, live
          preview and pinned footer the site composers use. */}
      <AdminComposer
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        eyebrow="Publishing"
        title={editingPost ? editingPost.title : "New Post"}
      >
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
      </AdminComposer>
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
      <AdminComposerBody
        preview={
          <ArticlePreview
            title={title}
            categoryName={category}
            contentHtml={contentHtml}
            coverUrl={coverUrl ?? existingCoverUrl}
            authorName={authorName}
            authorAvatarUrl={null}
          />
        }
      >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={adminLabel}>Title</span>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={adminField}
                  placeholder="Post title"
                />
              </label>
              <label className="grid gap-2">
                <span className={adminLabel}>Category</span>
                <input
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="dlg-categories"
                  required
                  className={adminField}
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
                <span className={adminLabel}>Tags</span>
                <input name="tags" defaultValue={initialValues?.tags ?? ""} list="dlg-tags" className={adminField} placeholder="Safety, Touring" />
              </label>
              <label className="grid gap-2">
                <span className={adminLabel}>Status</span>
                <select name="status" defaultValue={initialValues?.status ?? "PUBLISHED"} className={adminField}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className={adminLabel}>Excerpt</span>
              <textarea
                name="excerpt"
                rows={2}
                defaultValue={initialValues?.excerpt ?? ""}
                required
                className={adminField}
                placeholder="Shown on the magazine listing and in link previews"
              />
            </label>

            <div className="grid gap-2">
              <span className={adminLabel}>Cover Image</span>
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
              <p className={`mb-2 ${adminLabel}`}>Body</p>
              <WysiwygEditor tone="admin" value={contentHtml} onChange={onContentChange} placeholder="Write your post…" />
              <input type="hidden" name="contentHtml" value={contentHtml} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={adminLabel}>Published At</span>
                <input name="publishedAt" type="datetime-local" defaultValue={initialValues?.publishedAt ?? ""} className={adminField} />
              </label>
              <label className="grid gap-2">
                <span className={adminLabel}>SEO Title</span>
                <input name="seoTitle" defaultValue={initialValues?.seoTitle ?? ""} className={adminField} placeholder="Optional" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className={adminLabel}>SEO Description</span>
              <input name="seoDescription" defaultValue={initialValues?.seoDescription ?? ""} className={adminField} placeholder="Optional" />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input name="featured" type="checkbox" defaultChecked={initialValues?.featured ?? false} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sunset" />
              Feature this post
            </label>

        <AdminFormError>{state.error}</AdminFormError>
      </AdminComposerBody>

      <AdminComposerFooter note={`${wordCount} words`}>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          Cancel
        </button>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : initialValues ? "Update Post" : "Publish Post"}
        </Button>
      </AdminComposerFooter>
    </form>
  );
}
