"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ImagePlus, Link2, Trash2, X } from "lucide-react";

import { createJournalEntryAction, type JournalFormState } from "@/app/(site)/r/actions";
import { JournalPreview } from "@/components/profile/journal-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionTextarea } from "@/components/ui/mention-textarea";

const initial: JournalFormState = { error: null, success: null };

interface CreateJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  authorAvatarUrl: string | null;
}

/**
 * Full-screen composer with a live preview, matching the event create modal.
 *
 * A ride story is mostly a photo and some prose, and the old 448px dialog
 * showed neither — a raw "Choose File" button and a four-row textarea that hid
 * most of what had been typed. The preview is the real feed card, so the entry
 * is framed against how it will actually appear.
 */
export function CreateJournalDialog({
  open,
  onOpenChange,
  authorName,
  authorAvatarUrl,
}: CreateJournalDialogProps) {
  const router = useRouter();
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (prev: JournalFormState, formData: FormData) => createJournalEntryAction(prev, formData),
    initial,
  );

  // Reset everything on each fresh open — adjusted at render rather than in an
  // effect so a reopened composer never flashes the previous draft.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMediaType("photo");
      setTitle("");
      setBody("");
      setVideoUrl("");
      setPhotoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      setPhotoName(null);
    }
  }

  useEffect(() => {
    if (!state.success) return;
    onOpenChange(false);
    router.refresh();
  }, [router, state.success, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  function pickPhoto(file: File | undefined) {
    setPhotoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setPhotoName(file?.name ?? null);
  }

  if (!open || typeof document === "undefined") return null;

  const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

  return createPortal(
    <div
      className="safe-pb fixed inset-0 z-60 flex flex-col bg-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-modal-title"
    >
      <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Ride Journal</p>
          <h1 id="journal-modal-title" className="font-display text-xl text-ink sm:text-2xl">
            New Entry
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="-mr-1 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Same proportional two-column grid the event create modal uses, rather
          than a fixed-width rail — a 26rem sidebar left the rest of a wide
          screen empty. */}
      <form action={action} className="flex h-full min-h-0 flex-col">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {/* FORM COLUMN */}
          <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto max-w-2xl space-y-5">
            <div>
              <label htmlFor="create-title" className={labelClass}>
                Title <span className="normal-case text-muted/70">(optional)</span>
              </label>
              <Input
                id="create-title"
                name="title"
                placeholder="Give it a name"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="create-body" className={labelClass}>
                Story
              </label>
              <MentionTextarea
                id="create-body"
                name="body"
                rows={12}
                placeholder="How did the ride go? Use #tags and @mention riders"
                className="mt-1"
                required
                onValueChange={setBody}
              />
            </div>

            <div>
              <p className={labelClass}>Media (optional)</p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("photo")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mediaType === "photo" ? "bg-sunset text-white" : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Photo
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mediaType === "video" ? "bg-sunset text-white" : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" /> Video Link
                </button>
              </div>

              {/* Both inputs stay mounted: unmounting the file input would drop
                  a chosen photo the moment someone flicked to Video and back. */}
              <div className={mediaType === "photo" ? "mt-3" : "hidden"}>
                <label
                  htmlFor="create-photo"
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-muted transition hover:border-sunset/50 hover:text-sunset"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-sm font-semibold">
                    {photoName ? "Choose a different photo" : "Add a photo"}
                  </span>
                  <span className="text-xs">JPG, PNG or WebP</span>
                </label>
                <input
                  id="create-photo"
                  name="ridePhoto"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
                {photoName ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span className="truncate">{photoName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("create-photo") as HTMLInputElement | null;
                        if (input) input.value = "";
                        pickPhoto(undefined);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 text-red-600 transition hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </p>
                ) : null}
              </div>

              <div className={mediaType === "video" ? "mt-3" : "hidden"}>
                <Input
                  id="create-video"
                  name="videoUrl"
                  type="url"
                  placeholder="Paste YouTube, TikTok, Vimeo, or Instagram link"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <p className="mt-1 text-[0.65rem] text-muted">
                  Supports YouTube, TikTok, Vimeo, Instagram, and Facebook
                </p>
              </div>
            </div>

              {state.error ? (
                <p className="text-sm font-medium text-red-600">{state.error}</p>
              ) : null}
            </div>
          </div>

          {/* PREVIEW COLUMN */}
          <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
              <div className="mt-3">
                <JournalPreview
                  authorName={authorName}
                  authorAvatarUrl={authorAvatarUrl}
                  title={title}
                  body={body}
                  photoUrl={mediaType === "photo" ? photoUrl : null}
                  videoUrl={mediaType === "video" ? videoUrl : ""}
                />
              </div>
              <p className="mt-3 text-xs text-muted">Roughly how your entry will appear in the feed.</p>
            </div>
          </aside>
        </div>

        {/* Pinned footer, so Publish is reachable without scrolling a long story. */}
        <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
          <div className="mx-auto flex max-w-2xl justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
