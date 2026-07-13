"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { updateJournalEntryAction, deleteJournalEntryAction } from "@/app/(site)/riders/actions";
import { JournalInteractions } from "@/components/profile/journal-interactions";
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
import { mediaUrl } from "@/lib/media-url";

type JournalEntry = {
  id: string;
  title: string | null;
  body: string;
  createdAt: Date;
  galleryItems: { url: string; caption: string | null }[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments: { id: string; body: string; authorName: string; authorHandle: string; createdAt: string }[];
  profileUrl: string;
};

export function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const imageUrl = entry.galleryItems[0]?.url ? mediaUrl(entry.galleryItems[0].url) : null;

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateJournalEntryAction(entry.id, formData);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteJournalEntryAction(entry.id);
    });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift"
    >
      {/* Action icons — top-right, appear on hover */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} className="h-8 w-8 bg-white/80 backdrop-blur">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 text-red-600 backdrop-blur hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. The entry and its photo will be permanently removed.</AlertDialogDescription>
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

      {/* Image */}
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden">
          <img src={imageUrl} alt={entry.galleryItems[0]?.caption || entry.title || "Ride"} className="h-full w-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-sunset">
          {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        {entry.title && <h3 className="mt-1 font-display text-base font-semibold text-ink">{entry.title}</h3>}
        <p className="mt-1.5 line-clamp-3 text-sm text-muted">{entry.body}</p>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleEdit} className="mt-4 space-y-4">
            <div>
              <label htmlFor={`edit-title-${entry.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
              <Input id={`edit-title-${entry.id}`} name="title" defaultValue={entry.title ?? ""} className="mt-1" />
            </div>
            <div>
              <label htmlFor={`edit-body-${entry.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">Story</label>
              <Textarea id={`edit-body-${entry.id}`} name="body" rows={4} defaultValue={entry.body} className="mt-1" required />
            </div>
            <div>
              <label htmlFor={`edit-photo-${entry.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">Replace Photo</label>
              <Input id={`edit-photo-${entry.id}`} name="ridePhoto" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" />
            </div>
            {imageUrl && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input name="removePhoto" type="checkbox" className="rounded" />
                Remove current photo
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={editPending}>
                {editPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <JournalInteractions
        entryId={entry.id}
        likeCount={entry.likeCount}
        commentCount={entry.commentCount}
        isLiked={entry.isLiked}
        isAuthenticated={true}
        comments={entry.comments}
        entryUrl={entry.profileUrl}
      />
    </motion.article>
  );
}
