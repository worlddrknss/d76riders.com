"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { updateRoadAction, deleteRoadAction } from "@/app/(site)/roads/actions";
import { RoutePlannerField } from "@/components/routes/route-planner-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  scenicRating: number | null;
  hasImage: boolean;
  hasRoute: boolean;
  routeName: string | null;
  routeDescription: string | null;
};

export function RoadManageActions({ road }: { road: RoadData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
                This action cannot be undone. The road, its cover image, and attached route will be permanently removed.
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
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Road</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleEdit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-road-name" className="text-xs font-semibold uppercase tracking-wide text-muted">Road Name</label>
                <Input id="edit-road-name" name="name" defaultValue={road.name} className="mt-1" required />
              </div>
              <div>
                <label htmlFor="edit-road-diff" className="text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</label>
                <select id="edit-road-diff" name="difficulty" defaultValue={road.difficulty ?? ""} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                  <option value="">Not specified</option>
                  <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="SCENIC">Scenic</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-road-scenic" className="text-xs font-semibold uppercase tracking-wide text-muted">Scenic Rating</label>
                <Input id="edit-road-scenic" name="scenicRating" type="number" step="0.1" min={0} max={5} defaultValue={road.scenicRating ?? undefined} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-road-img" className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Image</label>
                <Input id="edit-road-img" name="coverImage" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
              </div>
            </div>

            <div>
              <label htmlFor="edit-road-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
              <Textarea id="edit-road-desc" name="description" rows={3} defaultValue={road.description ?? ""} className="mt-1" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-road-rname" className="text-xs font-semibold uppercase tracking-wide text-muted">Route Name</label>
                <Input id="edit-road-rname" name="routeName" defaultValue={road.routeName ?? ""} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-road-rdesc" className="text-xs font-semibold uppercase tracking-wide text-muted">Route Description</label>
                <Input id="edit-road-rdesc" name="routeDescription" defaultValue={road.routeDescription ?? ""} className="mt-1" />
              </div>
            </div>

            <RoutePlannerField
              title="Replace Road Route"
              helperText="Launch planner to update the saved road route."
              savedSummaryLabel="Saved road route"
              modalEyebrow="Featured Road Builder"
              modalTitle="Featured Road Route Planner"
              hiddenGeometryName="routeGeometryJson"
              hiddenWaypointsName="routeWaypointsJson"
              hiddenDistanceName="routeDistanceMiles"
            />

            <div className="flex flex-wrap gap-4 text-xs text-muted">
              {road.hasImage && (
                <label className="flex items-center gap-2">
                  <input name="removeCoverImage" type="checkbox" className="rounded" />
                  Remove current road image
                </label>
              )}
              {road.hasRoute && (
                <label className="flex items-center gap-2">
                  <input name="removeRoute" type="checkbox" className="rounded" />
                  Remove saved route
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                {editPending ? "Saving…" : "Save Road"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
