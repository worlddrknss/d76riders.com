"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { updateEventAction, deleteEventAction } from "@/app/(site)/events/[slug]/actions";
import { LocationAutocomplete } from "@/components/events/location-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { US_TIMEZONES } from "@/lib/datetime";
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
  excerpt: string | null;
  description: string | null;
  facebookEventUrl: string | null;
  timezone: string;
  startsAt: string; // datetime-local string, already in the event's timezone
  endsAt: string | null;
  ksuAt: string | null;
  meetLocation: string | null;
  meetAddress: string | null;
  meetLat: number | null;
  meetLng: number | null;
  ksuLocation: string | null;
  ksuAddress: string | null;
  ksuLat: number | null;
  ksuLng: number | null;
  distanceMiles: number | null;
  difficulty: string | null;
  maxCapacity: number | null;
  rsvpDeadline: string | null;
  galleryClosesAt: string | null;
  crewId: string | null;
  crewName: string | null;
  hasPhoto: boolean;
  hasRoute: boolean;
};

export function EventManageActions({
  event,
  crews = [],
}: {
  event: EventData;
  crews?: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [excerptValue, setExcerptValue] = useState(event.excerpt ?? "");

  // Refresh the excerpt when the dialog opens — the render-time "adjust state on
  // a change" pattern rather than an effect, so it never lags a frame.
  const [wasEditOpen, setWasEditOpen] = useState(editOpen);
  if (editOpen !== wasEditOpen) {
    setWasEditOpen(editOpen);
    if (editOpen) setExcerptValue(event.excerpt ?? "");
  }
  const [deletePending, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateEventAction(event.id, formData);
      setEditOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteEventAction(event.id);
      router.push("/events");
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
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleEdit} className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-event-title" className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
                <Input id="edit-event-title" name="title" defaultValue={event.title} className="mt-1" required />
              </div>
              <div>
                <label htmlFor="edit-event-excerpt" className="text-xs font-semibold uppercase tracking-wide text-muted">Excerpt</label>
                <Textarea
                  id="edit-event-excerpt"
                  name="excerpt"
                  rows={2}
                  maxLength={255}
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                  className="mt-1"
                  placeholder="Short summary shown on the events page."
                />
                <p className={`mt-1 text-right text-xs ${excerptValue.length > 255 ? "text-red-600" : "text-muted"}`}>
                  {excerptValue.length}/255
                </p>
              </div>
              <div>
                <label htmlFor="edit-event-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
                <Textarea id="edit-event-desc" name="description" rows={3} defaultValue={event.description ?? ""} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-event-facebook-url" className="text-xs font-semibold uppercase tracking-wide text-muted">Facebook Event URL</label>
                <Input
                  id="edit-event-facebook-url"
                  name="facebookEventUrl"
                  type="url"
                  placeholder="https://www.facebook.com/events/..."
                  defaultValue={event.facebookEventUrl ?? ""}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-event-tz" className="text-xs font-semibold uppercase tracking-wide text-muted">Timezone</label>
                <select id="edit-event-tz" name="timezone" defaultValue={event.timezone} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                  {US_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">The times below are the ride&apos;s local time in this zone.</p>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label htmlFor="edit-event-starts" className="text-xs font-semibold uppercase tracking-wide text-muted">Starts At</label>
                  <Input id="edit-event-starts" name="startsAt" type="datetime-local" defaultValue={event.startsAt} className="mt-1" required />
                </div>
                <div>
                  <label htmlFor="edit-event-ends" className="text-xs font-semibold uppercase tracking-wide text-muted">Ends At (optional)</label>
                  <Input id="edit-event-ends" name="endsAt" type="datetime-local" defaultValue={event.endsAt ?? ""} className="mt-1" />
                </div>
                <div>
                  <label htmlFor="edit-event-ksu" className="text-xs font-semibold uppercase tracking-wide text-muted">KSU At</label>
                  <Input id="edit-event-ksu" name="ksuAt" type="datetime-local" defaultValue={event.ksuAt ?? ""} className="mt-1" />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <LocationAutocomplete
                  fieldPrefix="meet"
                  label="Meet Location"
                  placeholder="Search a place or address…"
                  defaultValue={{ name: event.meetLocation, address: event.meetAddress, lat: event.meetLat, lng: event.meetLng }}
                />
                <LocationAutocomplete
                  fieldPrefix="ksu"
                  label="KSU Location (optional)"
                  placeholder="Only if departing from somewhere else"
                  hint="Leave blank if kickstands up is at the meetup location."
                  defaultValue={{ name: event.ksuLocation, address: event.ksuAddress, lat: event.ksuLat, lng: event.ksuLng }}
                />
              </div>
              <div className="grid gap-4 grid-cols-2">
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
              {crews.length > 0 || event.crewId ? (
                <div>
                  <label htmlFor="edit-event-crew" className="text-xs font-semibold uppercase tracking-wide text-muted">Sub-community</label>
                  <select id="edit-event-crew" name="crewId" defaultValue={event.crewId ?? ""} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                    <option value="">No sub-community</option>
                    {/* Preserve a current sub-community the editor isn't a member of. */}
                    {event.crewId && event.crewName && !crews.some((c) => c.id === event.crewId) ? (
                      <option value={event.crewId}>{event.crewName}</option>
                    ) : null}
                    {crews.map((crew) => (
                      <option key={crew.id} value={crew.id}>{crew.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label htmlFor="edit-event-capacity" className="text-xs font-semibold uppercase tracking-wide text-muted">Max Capacity</label>
                  <Input id="edit-event-capacity" name="maxCapacity" type="number" min={1} placeholder="No limit" defaultValue={event.maxCapacity ?? ""} className="mt-1" />
                </div>
                <div>
                  <label htmlFor="edit-event-rsvp-deadline" className="text-xs font-semibold uppercase tracking-wide text-muted">RSVP Deadline</label>
                  <Input id="edit-event-rsvp-deadline" name="rsvpDeadline" type="datetime-local" defaultValue={event.rsvpDeadline ?? ""} className="mt-1" />
                </div>
              </div>
              <div>
                <label htmlFor="edit-event-gallery-closes" className="text-xs font-semibold uppercase tracking-wide text-muted">Gallery closes at (optional)</label>
                <Input id="edit-event-gallery-closes" name="galleryClosesAt" type="datetime-local" defaultValue={event.galleryClosesAt ?? ""} className="mt-1" />
                <p className="mt-1 text-xs text-muted">Keep photo uploads open until this time (e.g. a week after the ride). After it, the gallery closes.</p>
              </div>
              <div>
                <label htmlFor="edit-event-photo" className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Image</label>
                <Input id="edit-event-photo" name="eventPhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
              </div>
            </div>
            <div className="col-span-full flex flex-wrap gap-4 text-xs text-muted">
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
            <div className="col-span-full flex justify-end gap-2 pt-2">
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
