"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ImagePlus, Plus, Route as RouteIcon, Trash2, X } from "lucide-react";

import { createRoadAction, type RoadFormState } from "@/app/(site)/roads/actions";
import { RoadPreview } from "@/components/roads/road-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: RoadFormState = { error: null, success: null };

/**
 * Full-screen road composer with a live preview, matching the event and journal
 * create modals. The route planner is deliberately not here — a road is created
 * first and its route is drawn afterwards from the "Add Route" button on the
 * road page, the same split events use, so mapping isn't forced up front.
 */
export function CreateRoadDialog({ riderName, riderHandle }: { riderName: string; riderHandle: string }) {
  const params = useSearchParams() ?? new URLSearchParams();
  // Opens automatically when reached via the top-bar "+ Create → New road".
  const [open, setOpen] = useState(() => params.get("new") === "1");
  const [state, formAction, pending] = useActionState<RoadFormState, FormData>(createRoadAction, initialState);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

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

  function pickPhoto(file: File | undefined) {
    setPhotoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setPhotoName(file?.name ?? null);
  }

  const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Road
      </Button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="safe-pb fixed inset-0 z-60 flex flex-col bg-surface"
              role="dialog"
              aria-modal="true"
              aria-labelledby="road-modal-title"
            >
              <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
                  <h1 id="road-modal-title" className="font-display text-xl text-ink sm:text-2xl">
                    New Road
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
                  {/* FORM COLUMN */}
                  <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
                    <div className="mx-auto max-w-2xl space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="create-road-name" className={labelClass}>
                            Road name
                          </label>
                          <Input
                            id="create-road-name"
                            name="name"
                            required
                            className="mt-1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tail of the Dragon"
                          />
                        </div>
                        <div>
                          <label htmlFor="create-road-diff" className={labelClass}>
                            Difficulty
                          </label>
                          <select
                            id="create-road-diff"
                            name="difficulty"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
                          >
                            <option value="">Not specified</option>
                            <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="SCENIC">Scenic</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="create-road-desc" className={labelClass}>
                          Description
                        </label>
                        <Textarea
                          id="create-road-desc"
                          name="description"
                          rows={6}
                          className="mt-1"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What makes it worth the ride — the curves, the views, what to watch for."
                        />
                      </div>

                      <div>
                        <p className={labelClass}>Cover photo (optional)</p>
                        <div className="mt-2">
                          <label
                            htmlFor="create-road-img"
                            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-muted transition hover:border-sunset/50 hover:text-sunset"
                          >
                            <ImagePlus className="h-6 w-6" />
                            <span className="text-sm font-semibold">
                              {photoName ? "Choose a different photo" : "Add a photo"}
                            </span>
                            <span className="text-xs">JPG, PNG or WebP</span>
                          </label>
                          <input
                            id="create-road-img"
                            name="coverImage"
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
                                  const input = document.getElementById("create-road-img") as HTMLInputElement | null;
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
                      </div>

                      {/* The route is drawn after the road exists, from its page. */}
                      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-canvas p-4">
                        <RouteIcon className="mt-0.5 h-5 w-5 shrink-0 text-sunset" />
                        <p className="text-sm text-muted">
                          Save the road first, then draw its GPS route with the{" "}
                          <span className="font-semibold text-ink">Add Route</span> button on the road&apos;s
                          page. Distance and elevation come from the route once it&apos;s drawn.
                        </p>
                      </div>

                      {state.error ? (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {state.error}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* PREVIEW COLUMN */}
                  <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
                    <div className="mx-auto max-w-md">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
                      <div className="mt-3">
                        <RoadPreview
                          name={name}
                          description={description}
                          difficulty={difficulty}
                          imageUrl={photoUrl}
                          riderName={riderName}
                          riderHandle={riderHandle}
                        />
                      </div>
                      <p className="mt-3 text-xs text-muted">Roughly how it&apos;ll appear on the Roads page.</p>
                    </div>
                  </aside>
                </div>

                <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
                  <div className="mx-auto flex max-w-2xl justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="accent" size="sm" disabled={pending}>
                      {pending ? "Creating…" : "Create Road"}
                    </Button>
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
