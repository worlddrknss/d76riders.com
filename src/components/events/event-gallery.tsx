"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";

import { addEventPhotosAction, deleteEventPhotoAction } from "@/app/(site)/events/[slug]/gallery-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/media-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EventPhoto = {
  id: string;
  url: string;
  caption: string | null;
  uploaderName: string | null;
  uploaderHandle: string | null;
  canDelete: boolean;
};

export function EventGallery({
  eventId,
  photos,
  canUpload,
  closed = false,
}: {
  eventId: string;
  photos: EventPhoto[];
  canUpload: boolean;
  /** Uploads are closed (past the grace deadline / ride closed). */
  closed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function upload(formData: FormData) {
    start(async () => {
      await addEventPhotosAction(eventId, formData);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function remove(photoId: string) {
    start(async () => {
      await deleteEventPhotoAction(photoId);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          Gallery {photos.length > 0 && <span className="text-muted">· {photos.length}</span>}
        </h2>
        {canUpload ? (
          <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <ImagePlus className="h-4 w-4" />
            Add photos
          </Button>
        ) : closed ? (
          <span className="text-xs font-medium text-muted">Uploads closed</span>
        ) : null}
      </div>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center text-sm text-muted">
          No photos yet.{canUpload ? " Be the first to share shots from this ride." : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-canvas">
              <a href={mediaUrl(p.url)} target="_blank" rel="noopener noreferrer">
                <img src={mediaUrl(p.url)} alt={p.caption ?? ""} className="aspect-square w-full object-cover transition group-hover:scale-105" />
              </a>
              {p.canDelete && (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={pending}
                  className="absolute right-2 top-2 rounded-md bg-asphalt/80 p-1.5 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-asphalt/85 to-transparent p-2">
                {p.caption && <p className="truncate text-xs text-white">{p.caption}</p>}
                {p.uploaderHandle ? (
                  <Link href={`/r/${p.uploaderHandle}`} className="text-[0.65rem] text-white/80 hover:underline">
                    {p.uploaderName}
                  </Link>
                ) : (
                  <span className="text-[0.65rem] text-white/80">{p.uploaderName}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add photos</DialogTitle>
            <DialogDescription>Share your shots from this ride. You&apos;re credited on each one.</DialogDescription>
          </DialogHeader>
          <form ref={formRef} action={upload} className="mt-2 space-y-3">
            <input
              name="photos"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              required
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
            />
            <div>
              <label htmlFor="eg-caption" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Caption <span className="normal-case text-muted/70">(optional, applies to all)</span>
              </label>
              <Input id="eg-caption" name="caption" placeholder="Great turnout!" className="mt-1" />
            </div>
            <p className="text-xs text-muted">Up to 10 photos at a time.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
