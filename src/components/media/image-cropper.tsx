"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Move, X, ZoomIn } from "lucide-react";

type ImageCropperProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Width ÷ height of the crop. 1 for an avatar, 3 for a cover banner. */
  aspect: number;
  /** Width of the saved image; height follows from `aspect`. */
  outputWidth: number;
  shape?: "circle" | "rect";
  /** Existing image to open with, so it can be re-framed without re-uploading. */
  initialSrc?: string | null;
  /** Persist the cropped result. Returns an error string to show, or null. */
  onSave: (file: File) => Promise<{ error: string | null }>;
  emptyHint?: string;
};

/**
 * Drag-and-zoom cropper shared by the avatar and cover editors.
 *
 * The crop is baked into the uploaded file rather than stored as offsets: both
 * images are rendered as plain <img> tags in dozens of places, so storing the
 * framing would mean teaching every one of them the transform, and any site
 * that was missed would show a different crop.
 *
 * The stage is measured rather than assumed, so the same maths works for a
 * square avatar dialog and a wide cover banner on a phone.
 */
export function ImageCropper({
  open,
  onClose,
  title,
  aspect,
  outputWidth,
  shape = "rect",
  initialSrc = null,
  onSave,
  emptyHint = "JPG, PNG or WebP",
}: ImageCropperProps) {
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [fileType, setFileType] = useState("image/jpeg");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ startX: number; startY: number; from: { x: number; y: number } } | null>(null);

  // The image is scaled so its shorter edge covers the stage — that "cover"
  // scale is the 1× baseline the zoom slider multiplies.
  const baseScale = natural && stage.w ? Math.max(stage.w / natural.w, stage.h / natural.h) : 1;
  const drawnW = natural ? natural.w * baseScale * zoom : 0;
  const drawnH = natural ? natural.h * baseScale * zoom : 0;
  // Slack is the overhang past the stage; panning past it would expose a gap.
  const maxX = Math.max(0, (drawnW - stage.w) / 2);
  const maxY = Math.max(0, (drawnH - stage.h) / 2);

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
          x: drag.current.from.x + (event.clientX - drag.current.startX),
          y: drag.current.from.y + (event.clientY - drag.current.startY),
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
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Measure the stage instead of hard-coding it — a cover banner is a very
  // different width on a phone than in the dialog on a desktop.
  const attachStage = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setStage({ w: rect.width, h: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Re-clamp when zooming out (or a resize) shrinks the slack the offset used.
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
      // Only blob: URLs are ours to revoke — a seeded stored URL is not.
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return objectUrl;
    });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
  }

  async function save() {
    const image = imgRef.current;
    if (!image || !natural || !stage.w) {
      setError("Choose a photo first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const outputHeight = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");

      // Redraw exactly what the stage shows, scaled up to the output size.
      const ratio = outputWidth / stage.w;
      const w = drawnW * ratio;
      const h = drawnH * ratio;
      const x = (outputWidth - w) / 2 + offset.x * ratio;
      const y = (outputHeight - h) / 2 + offset.y * ratio;

      // PNGs may be transparent; flatten onto white so it isn't saved as black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, x, y, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, fileType, fileType === "image/png" ? undefined : 0.92),
      );
      if (!blob) throw new Error("Could not process that image.");

      const ext = fileType === "image/png" ? "png" : "jpg";
      const result = await onSave(new File([blob], `image.${ext}`, { type: fileType }));
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that photo.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {src ? (
              <>
                <div
                  ref={attachStage}
                  className={`relative mx-auto w-full touch-none select-none overflow-hidden bg-canvas ${
                    shape === "circle" ? "rounded-full" : "rounded-xl"
                  }`}
                  style={{ aspectRatio: `${aspect}`, maxWidth: shape === "circle" ? 288 : undefined }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    drag.current = { startX: event.clientX, startY: event.clientY, from: offset };
                  }}
                >
                  <img
                    ref={imgRef}
                    src={src}
                    alt=""
                    draggable={false}
                    onLoad={(e) =>
                      setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                    }
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: drawnW || undefined,
                      height: drawnH || undefined,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
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
                <span className="text-xs">{emptyHint}</span>
              </button>
            )}

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
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
    </>
  );
}
