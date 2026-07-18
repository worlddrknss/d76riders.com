"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";

import { createStoryAction, type StoryFormState } from "@/app/(site)/stories/actions";

const initial: StoryFormState = { error: null, success: null };

export function StoryComposer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStoryAction, initial);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, router, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Add to your story</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">A quick shot from the road. Gone in 24 hours.</p>

        <form action={action} className="mt-4 space-y-4">
          <label className="flex aspect-4/5 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas text-muted transition hover:border-sunset/50">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Choose a photo</span>
              </>
            )}
            <input
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp"
              required
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>

          <input
            name="caption"
            maxLength={140}
            placeholder="Add a caption (optional)"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />

          {state.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26] disabled:opacity-60"
          >
            {pending ? "Posting…" : "Share story"}
          </button>
        </form>
      </div>
    </div>
  );
}
