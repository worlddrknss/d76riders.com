"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";

import { updateRoadAction, deleteRoadAction } from "@/app/(site)/roads/actions";
import { RoadPreview } from "@/components/roads/road-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type RoadData = {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  hasImage: boolean;
  hasRoute: boolean;
  canDelete: boolean;
  coverImageUrl: string | null;
  riderName: string;
  riderHandle: string;
};

/**
 * Owner edit + delete for a road.
 *
 * Edit is a full-screen modal with a live preview, matching the create modal
 * and the event edit modal. The route planner isn't here — the route is drawn
 * from the "Add Route" button on the road page, so editing the road's details
 * and drawing its line are separate jobs.
 */
export function RoadManageActions({ road }: { road: RoadData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const [name, setName] = useState(road.name);
  const [description, setDescription] = useState(road.description ?? "");
  const [difficulty, setDifficulty] = useState(road.difficulty ?? "");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [newPhotoName, setNewPhotoName] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Reseed from the road each time the modal opens, so a cancelled edit doesn't
  // linger — adjusted at render on the open change, not in an effect.
  const [wasOpen, setWasOpen] = useState(editOpen);
  if (editOpen !== wasOpen) {
    setWasOpen(editOpen);
    if (editOpen) {
      setName(road.name);
      setDescription(road.description ?? "");
      setDifficulty(road.difficulty ?? "");
      setNewPhotoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      setNewPhotoName(null);
      setRemoveImage(false);
    }
  }

  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [editOpen]);

  function pickPhoto(file: File | undefined) {
    setNewPhotoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setNewPhotoName(file?.name ?? null);
    if (file) setRemoveImage(false);
  }

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateRoadAction(road.id, formData);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteRoadAction(road.id);
    });
  }

  // What the preview shows: a freshly-picked photo, else the current one unless
  // it's being removed.
  const previewImage = newPhotoUrl ?? (removeImage ? null : road.coverImageUrl);
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditOpen(true)}
          className="h-8 w-8 bg-white/80 backdrop-blur"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {road.canDelete ? (
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 text-red-600 backdrop-blur hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this road?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone — the road, its cover image, and attached route are permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        ) : null}
      </div>

      {editOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="safe-pb fixed inset-0 z-60 flex flex-col bg-surface"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-road-modal-title"
            >
              <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
                  <h1 id="edit-road-modal-title" className="font-display text-xl text-ink sm:text-2xl">
                    Edit Road
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  aria-label="Close"
                  className="-mr-1 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <form action={handleEdit} className="flex h-full min-h-0 flex-col">
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
                    <div className="mx-auto max-w-2xl space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="edit-road-name" className={labelClass}>
                            Road name
                          </label>
                          <Input
                            id="edit-road-name"
                            name="name"
                            required
                            className="mt-1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-road-diff" className={labelClass}>
                            Difficulty
                          </label>
                          <select
                            id="edit-road-diff"
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
                        <label htmlFor="edit-road-desc" className={labelClass}>
                          Description
                        </label>
                        <Textarea
                          id="edit-road-desc"
                          name="description"
                          rows={6}
                          className="mt-1"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div>
                        <p className={labelClass}>Cover photo</p>
                        <div className="mt-2">
                          <label
                            htmlFor="edit-road-img"
                            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-muted transition hover:border-sunset/50 hover:text-sunset"
                          >
                            <ImagePlus className="h-6 w-6" />
                            <span className="text-sm font-semibold">
                              {newPhotoName || road.hasImage ? "Choose a different photo" : "Add a photo"}
                            </span>
                            <span className="text-xs">JPG, PNG or WebP</span>
                          </label>
                          <input
                            id="edit-road-img"
                            name="coverImage"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => pickPhoto(e.target.files?.[0])}
                          />
                          {newPhotoName ? (
                            <p className="mt-2 text-xs text-muted">{newPhotoName}</p>
                          ) : road.hasImage ? (
                            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                              <input
                                name="removeCoverImage"
                                type="checkbox"
                                checked={removeImage}
                                onChange={(e) => setRemoveImage(e.target.checked)}
                                className="rounded accent-sunset"
                              />
                              Remove the current photo
                            </label>
                          ) : null}
                        </div>
                      </div>

                      {road.hasRoute ? (
                        <label className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-canvas p-4 text-sm text-muted">
                          <input name="removeRoute" type="checkbox" className="rounded accent-sunset" />
                          Remove the saved route. You can redraw it anytime with{" "}
                          <span className="font-semibold text-ink">Add Route</span> on the road page.
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
                    <div className="mx-auto max-w-md">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
                      <div className="mt-3">
                        <RoadPreview
                          name={name}
                          description={description}
                          difficulty={difficulty}
                          imageUrl={previewImage}
                          riderName={road.riderName}
                          riderHandle={road.riderHandle}
                        />
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
                  <div className="mx-auto flex max-w-2xl justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                      {editPending ? "Saving…" : "Save Road"}
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
