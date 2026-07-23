"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Move, Pencil, X, ZoomIn } from "lucide-react";

import { updateAvatarAction } from "@/app/(site)/account/actions";

type AvatarEditorProps = {
  url: string | null;
  name: string;
};

/** Edge length of the saved image. 512 stays crisp on retina at any size we render. */
const OUTPUT_SIZE = 512;
/** Edge length of the on-screen crop stage, in CSS pixels. */
const STAGE = 288;

export function AvatarEditor({ url, name }: AvatarEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Seeded with the current avatar so an existing photo can be re-framed
  // without re-uploading it. It is served same-origin from /api/media, so it
  // does not taint the canvas.
  const [src, setSrc] = useState<string | null>(url);
  const [fileType, setFileType] = useState("image/jpeg");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);
  // Natural size of the chosen image, needed to work out how far it can pan.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // The image is scaled so its shorter edge covers the stage — that "cover"
  // scale is the 1× baseline the zoom slider multiplies.
  const baseScale = natural ? Math.max(STAGE / natural.w, STAGE / natural.h) : 1;
  const drawnW = natural ? natural.w * baseScale * zoom : 0;
  const drawnH = natural ? natural.h * baseScale * zoom : 0;
  // Slack is the overhang past the stage; panning beyond it would expose gaps.
  const maxX = Math.max(0, (drawnW - STAGE) / 2);
  const maxY = Math.max(0, (drawnH - STAGE) / 2);

  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }),
    [maxX, maxY],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!drag.current) return;
      setOffset(
        clamp({
          x: drag.current.startOffset.x + (event.clientX - drag.current.startX),
          y: drag.current.startOffset.y + (event.clientY - drag.current.startY),
        }),
      );
    },
    [clamp],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [open, onPointerMove, onPointerUp]);

  // Lock the page behind the dialog and let Escape close it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Re-clamp when zooming out shrinks the slack the current offset relied on.
  const [lastBounds, setLastBounds] = useState({ maxX, maxY });
  if (maxX !== lastBounds.maxX || maxY !== lastBounds.maxY) {
    setLastBounds({ maxX, maxY });
    setOffset((o) => ({
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    }));
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setFileType(file.type === "image/png" ? "image/png" : "image/jpeg");
    const objectUrl = URL.createObjectURL(file);
    setSrc((old) => {
      // Only blob: URLs are ours to revoke — the seeded avatar URL is not.
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return objectUrl;
    });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
  }

  function openEditor() {
    setError(null);
    setOpen(true);
    // Nothing to frame until they choose a photo, so go straight to the picker.
    if (!src) requestAnimationFrame(() => fileRef.current?.click());
  }

  function closeEditor() {
    setOpen(false);
    setError(null);
  }

  async function save() {
    const image = imgRef.current;
    if (!image || !natural) {
      setError("Choose a photo first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");

      // Redraw the same transform the stage shows, scaled up to the output size.
      const ratio = OUTPUT_SIZE / STAGE;
      const w = drawnW * ratio;
      const h = drawnH * ratio;
      const x = (OUTPUT_SIZE - w) / 2 + offset.x * ratio;
      const y = (OUTPUT_SIZE - h) / 2 + offset.y * ratio;

      // PNGs may be transparent; flatten onto white so the circle isn't black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, x, y, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, fileType, fileType === "image/png" ? undefined : 0.92),
      );
      if (!blob) throw new Error("Could not process that image.");

      const form = new FormData();
      const ext = fileType === "image/png" ? "png" : "jpg";
      form.append("avatarFile", new File([blob], `avatar.${ext}`, { type: fileType }));

      const result = await updateAvatarAction(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        aria-label={`Change ${name}'s profile picture`}
        className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-asphalt text-white shadow-lift transition hover:bg-sunset sm:h-10 sm:w-10"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      {open && (
        <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEditor} />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose profile picture"
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg text-ink">Choose profile picture</h2>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {src ? (
                <>
                  {/* Crop stage: the image pans under a fixed circular mask, so
                      what's inside the circle is exactly what gets saved. */}
                  <div
                    className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-canvas"
                    style={{ width: STAGE, height: STAGE, maxWidth: "100%" }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      drag.current = {
                        startX: event.clientX,
                        startY: event.clientY,
                        startOffset: offset,
                      };
                    }}
                  >
                    <img
                      ref={imgRef}
                      src={src}
                      alt=""
                      draggable={false}
                      onLoad={(e) =>
                        setNatural({
                          w: e.currentTarget.naturalWidth,
                          h: e.currentTarget.naturalHeight,
                        })
                      }
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none cursor-grab"
                      style={{
                        width: drawnW || undefined,
                        height: drawnH || undefined,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                        <Move className="h-3.5 w-3.5" />
                        Drag to reposition
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <ZoomIn className="h-4 w-4 shrink-0 text-muted" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      aria-label="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-sunset"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
                  >
                    <ImageUp className="h-4 w-4" />
                    Choose a different photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-canvas px-4 py-10 text-muted transition hover:border-sunset/50 hover:text-sunset"
                >
                  <Camera className="h-7 w-7" />
                  <span className="text-sm font-semibold">Upload a photo</span>
                  <span className="text-xs">JPG, PNG or WebP</span>
                </button>
              )}

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !src}
                className="rounded-lg bg-sunset px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
