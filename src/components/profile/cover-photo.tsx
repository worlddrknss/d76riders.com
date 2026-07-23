"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Move, X } from "lucide-react";

import { updateCoverPositionAction } from "@/app/(site)/account/actions";
import { CoverEditor } from "@/components/profile/cover-editor";

type CoverPhotoProps = {
  url: string | null;
  name: string;
  /** object-position Y percentage, 0 (top) – 100 (bottom). */
  position: number;
  canReposition: boolean;
};

/**
 * Profile cover, with two ways to change it.
 *
 * Edit Cover opens the cropper: pick a photo, zoom and pan, and the framing is
 * baked into a 3:1 banner. Reposition then nudges the vertical crop of that
 * stored image — still worth having, because the banner is a different aspect
 * on a phone than on a desktop, so there is usually slack to shift.
 *
 * Only the vertical axis moves here: the image is scaled to the full width of
 * the card, so there is only ever vertical slack to pan through. Dragging maps
 * pixels to percent using the container height rather than the image's natural
 * height — the container is what the drag is actually reframing against.
 */
export function CoverPhoto({ url, name, position, canReposition }: CoverPhotoProps) {
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState(position);
  const [saving, setSaving] = useState(false);

  // What to restore to if the drag is cancelled. State rather than a ref, so it
  // can be re-synced during render below without mutating a ref mid-render.
  const [committed, setCommitted] = useState(position);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startPos: number } | null>(null);

  // Re-sync when the server sends a new value (e.g. saved from another tab).
  // Adjusted during render rather than in an effect — React re-runs this
  // component immediately without a second commit, and it avoids the cascading
  // render an effect-based reset would cause.
  const [lastPosition, setLastPosition] = useState(position);
  if (position !== lastPosition) {
    setLastPosition(position);
    setPos(position);
    setCommitted(position);
  }

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (!drag.current || !containerRef.current) return;
    const height = containerRef.current.offsetHeight || 1;
    const deltaY = event.clientY - drag.current.startY;
    // Drag down → reveal more of the top of the image, so the percentage falls.
    const next = drag.current.startPos - (deltaY / height) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  useEffect(() => {
    if (!editing) return;
    // Listeners live on window so a drag that leaves the cover still tracks.
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [editing, onPointerMove, onPointerUp]);

  async function save() {
    setSaving(true);
    try {
      await updateCoverPositionAction(Math.round(pos));
      setCommitted(pos);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setPos(committed);
    setEditing(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-44 w-full select-none sm:h-64 ${editing ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerDown={(event) => {
        if (!editing) return;
        event.preventDefault();
        drag.current = { startY: event.clientY, startPos: pos };
      }}
    >
      {url ? (
         
        <img
          src={url}
          alt={`${name}'s cover`}
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: `center ${pos}%` }}
        />
      ) : (
        <div className="h-full w-full bg-linear-to-br from-asphalt via-asphalt to-sunset/40" />
      )}

      {/* Keeps the avatar and controls readable over a busy photo. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 to-transparent" />

      {/* Two controls, two jobs: the cropper replaces the photo and bakes the
          framing; Reposition nudges the vertical crop of whatever is already
          there, which is still useful because the banner's aspect changes with
          the viewport. Reposition only appears once there is a photo. */}
      {canReposition ? (
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          {!editing ? <CoverEditor url={url} /> : null}
          {!url ? null : editing ? (
            <>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-sunset px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:bg-[#cf5a26] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save Position"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60"
            >
              <Move className="h-3.5 w-3.5" />
              Reposition
            </button>
          )}
        </div>
      ) : null}

      {editing ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            Drag to reposition
          </span>
        </div>
      ) : null}
    </div>
  );
}
