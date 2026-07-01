"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { updateEventAction, deleteEventAction } from "@/app/events/[slug]/actions";
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

type EventData = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string; // ISO string from server
  ksuAt: string | null;
  meetLocation: string | null;
  ksuLocation: string | null;
  distanceMiles: number | null;
  difficulty: string | null;
  hasPhoto: boolean;
  hasRoute: boolean;
};

export function EventManageActions({ event }: { event: EventData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateEventAction(event.id, formData);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteEventAction(event.id);
    });
  }

  return (
    <>
      {/* Floating action icons */}
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
              <AlertDialogTitle>Delete this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The event, its cover image, and attached route will be permanently removed.
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleEdit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="edit-event-title" className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
              <Input id="edit-event-title" name="title" defaultValue={event.title} className="mt-1" required />
            </div>
            <div>
              <label htmlFor="edit-event-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
              <Textarea id="edit-event-desc" name="description" rows={3} defaultValue={event.description ?? ""} className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-event-starts" className="text-xs font-semibold uppercase tracking-wide text-muted">Starts At</label>
                <Input id="edit-event-starts" name="startsAt" type="datetime-local" defaultValue={event.startsAt.slice(0, 16)} className="mt-1" required />
              </div>
              <div>
                <label htmlFor="edit-event-ksu" className="text-xs font-semibold uppercase tracking-wide text-muted">KSU At</label>
                <Input id="edit-event-ksu" name="ksuAt" type="datetime-local" defaultValue={event.ksuAt?.slice(0, 16) ?? ""} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-event-meet" className="text-xs font-semibold uppercase tracking-wide text-muted">Meet Location</label>
                <Input id="edit-event-meet" name="meetLocation" defaultValue={event.meetLocation ?? ""} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-event-ksu-loc" className="text-xs font-semibold uppercase tracking-wide text-muted">KSU Location</label>
                <Input id="edit-event-ksu-loc" name="ksuLocation" defaultValue={event.ksuLocation ?? ""} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-event-dist" className="text-xs font-semibold uppercase tracking-wide text-muted">Distance (miles)</label>
                <Input id="edit-event-dist" name="distanceMiles" type="number" defaultValue={event.distanceMiles ?? ""} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-event-diff" className="text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</label>
                <select id="edit-event-diff" name="difficulty" defaultValue={event.difficulty ?? ""} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                  <option value="">Not specified</option>
                  <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="SCENIC">Scenic</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="edit-event-photo" className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Image</label>
              <Input id="edit-event-photo" name="eventPhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              {event.hasPhoto && (
                <label className="flex items-center gap-2">
                  <input name="removePhoto" type="checkbox" className="rounded" />
                  Remove current cover image
                </label>
              )}
              {event.hasRoute && (
                <label className="flex items-center gap-2">
                  <input name="removeRoute" type="checkbox" className="rounded" />
                  Remove official route
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                {editPending ? "Saving…" : "Save Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
