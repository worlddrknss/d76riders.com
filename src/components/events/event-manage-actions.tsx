"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";

import { updateEventAction, deleteEventAction } from "@/app/(site)/events/[slug]/actions";
import { EventPreview } from "@/components/events/event-preview";
import { LocationAutocomplete } from "@/components/events/location-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { US_TIMEZONES } from "@/lib/datetime";
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
  endLocation: string | null;
  endAddress: string | null;
  endLat: number | null;
  endLng: number | null;
  distanceMiles: number | null;
  difficulty: string | null;
  maxCapacity: number | null;
  rsvpDeadline: string | null;
  galleryClosesAt: string | null;
  crewId: string | null;
  crewName: string | null;
  photoUrl: string | null;
  hasPhoto: boolean;
  hasRoute: boolean;
};

const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-muted";
const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none";

export function EventManageActions({
  event,
  crews = [],
}: {
  event: EventData;
  crews?: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  // Controlled only for the fields the live preview reflects.
  const [title, setTitle] = useState(event.title);
  const [excerpt, setExcerpt] = useState(event.excerpt ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(event.startsAt);
  const [timezone, setTimezone] = useState(event.timezone);
  const [difficulty, setDifficulty] = useState(event.difficulty ?? "");
  const [distance, setDistance] = useState(event.distanceMiles?.toString() ?? "");
  const [crewId, setCrewId] = useState(event.crewId ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(event.photoUrl);
  const [removePhoto, setRemovePhoto] = useState(false);

  // Reseed from the event each time the modal opens (render-time reset, no effect
  // lag) so re-opening after a change always shows current values.
  const [wasOpen, setWasOpen] = useState(editOpen);
  if (editOpen !== wasOpen) {
    setWasOpen(editOpen);
    if (editOpen) {
      setTitle(event.title);
      setExcerpt(event.excerpt ?? "");
      setDescription(event.description ?? "");
      setStartsAt(event.startsAt);
      setTimezone(event.timezone);
      setDifficulty(event.difficulty ?? "");
      setDistance(event.distanceMiles?.toString() ?? "");
      setCrewId(event.crewId ?? "");
      setPhotoUrl(event.photoUrl);
      setRemovePhoto(false);
    }
  }

  // Escape + scroll lock while the full-screen editor is open.
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

  const photoObjectUrlRef = useRef<string | null>(null);
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0] ?? null;
    if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
    if (file) {
      const url = URL.createObjectURL(file);
      photoObjectUrlRef.current = url;
      setPhotoUrl(url);
      setRemovePhoto(false);
    } else {
      photoObjectUrlRef.current = null;
      setPhotoUrl(event.photoUrl);
    }
  }
  useEffect(() => () => {
    if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
  }, []);

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

  const previewCrewName = crewId
    ? crews.find((c) => c.id === crewId)?.name ?? (crewId === event.crewId ? event.crewName : null)
    : null;

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

      {/* Full-screen edit modal — mirrors the create modal (form + live preview). */}
      {editOpen ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-surface"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-modal-title"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
              <h1 id="edit-event-modal-title" className="font-display text-xl text-ink sm:text-2xl">
                Edit Event
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

          <form action={handleEdit} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              {/* Fields */}
              <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
                <div className="mx-auto max-w-2xl space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-title" className={labelClass}>Event Title</label>
                    <Input id="edit-event-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-excerpt" className={labelClass}>Excerpt</label>
                    <Textarea
                      id="edit-event-excerpt"
                      name="excerpt"
                      rows={2}
                      maxLength={255}
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Short summary shown on the events page."
                    />
                    <p className={`text-right text-xs ${excerpt.length > 255 ? "text-red-600" : "text-muted"}`}>{excerpt.length}/255</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-desc" className={labelClass}>Description</label>
                    <Textarea id="edit-event-desc" name="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-facebook-url" className={labelClass}>Facebook Event URL</label>
                    <Input id="edit-event-facebook-url" name="facebookEventUrl" type="url" placeholder="https://www.facebook.com/events/..." defaultValue={event.facebookEventUrl ?? ""} />
                  </div>

                  {crews.length > 0 || event.crewId ? (
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-crew" className={labelClass}>Sub-community (Optional)</label>
                      <select id="edit-event-crew" name="crewId" value={crewId} onChange={(e) => setCrewId(e.target.value)} className={selectClass}>
                        <option value="">No sub-community</option>
                        {event.crewId && event.crewName && !crews.some((c) => c.id === event.crewId) ? (
                          <option value={event.crewId}>{event.crewName}</option>
                        ) : null}
                        {crews.map((crew) => (
                          <option key={crew.id} value={crew.id}>{crew.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-photo" className={labelClass}>Cover Image</label>
                    <Input id="edit-event-photo" name="eventPhoto" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-tz" className={labelClass}>Timezone</label>
                    <select id="edit-event-tz" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
                      {US_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted">The times below are the ride&apos;s local time in this zone.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-starts" className={labelClass}>Arrival Time (Required)</label>
                      <Input id="edit-event-starts" name="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-ksu" className={labelClass}>KSU Time (Optional)</label>
                      <Input id="edit-event-ksu" name="ksuAt" type="datetime-local" defaultValue={event.ksuAt ?? ""} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-ends" className={labelClass}>Event End (Optional)</label>
                      <Input id="edit-event-ends" name="endsAt" type="datetime-local" defaultValue={event.endsAt ?? ""} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LocationAutocomplete
                      fieldPrefix="meet"
                      label="Meetup Location"
                      placeholder="Search a place or address…"
                      hint="Where riders gather and kickstands go up."
                      defaultValue={{ name: event.meetLocation, address: event.meetAddress, lat: event.meetLat, lng: event.meetLng }}
                    />
                    <LocationAutocomplete
                      fieldPrefix="end"
                      label="Final Destination (optional)"
                      placeholder="Where the ride ends…"
                      hint="Leave blank for an out-and-back or open-ended ride."
                      defaultValue={{ name: event.endLocation, address: event.endAddress, lat: event.endLat, lng: event.endLng }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-dist" className={labelClass}>Distance (Miles)</label>
                      <Input id="edit-event-dist" name="distanceMiles" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-diff" className={labelClass}>Difficulty</label>
                      <select id="edit-event-diff" name="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectClass}>
                        <option value="">Not specified</option>
                        <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="SCENIC">Scenic</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-capacity" className={labelClass}>Max Capacity (Optional)</label>
                      <Input id="edit-event-capacity" name="maxCapacity" type="number" min={1} placeholder="No limit" defaultValue={event.maxCapacity ?? ""} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-event-rsvp-deadline" className={labelClass}>RSVP Deadline (Optional)</label>
                      <Input id="edit-event-rsvp-deadline" name="rsvpDeadline" type="datetime-local" defaultValue={event.rsvpDeadline ?? ""} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-event-gallery-closes" className={labelClass}>Gallery Closes (Optional)</label>
                    <Input id="edit-event-gallery-closes" name="galleryClosesAt" type="datetime-local" defaultValue={event.galleryClosesAt ?? ""} />
                    <p className="text-xs text-muted">Photo uploads stay open until this time, then the gallery closes.</p>
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-canvas px-5 py-6 sm:px-8 lg:block">
                <div className="mx-auto max-w-md">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
                  <div className="mt-3">
                    <EventPreview
                      title={title}
                      excerpt={excerpt}
                      description={description}
                      startsAt={startsAt}
                      timezone={timezone}
                      difficulty={difficulty}
                      distance={distance}
                      crewName={previewCrewName}
                      photoUrl={removePhoto ? null : photoUrl}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted">Roughly how your ride will appear on the events page.</p>
                </div>
              </aside>
            </div>

            {/* Footer: remove toggles + actions */}
            <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">
              <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4 text-xs text-muted">
                  {event.hasPhoto && (
                    <label className="flex items-center gap-2">
                      <input name="removePhoto" type="checkbox" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} className="rounded" />
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
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                    {editPending ? "Saving…" : "Save Event"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
