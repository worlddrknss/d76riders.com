"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImagePlus, Link2, Pencil, Trash2 } from "lucide-react";

import { updateJournalEntryAction, deleteJournalEntryAction } from "@/app/(site)/r/actions";
import { JournalInteractions } from "@/components/profile/journal-interactions";
import { ReportJournalButton } from "@/components/profile/report-journal-button";
import { VideoEmbed } from "@/components/ui/video-embed";
import { Linkify } from "@/components/ui/linkify";
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

type Comment = { id: string; body: string; authorName: string; authorHandle: string; createdAt: string };

export type JournalGridEntry = {
  id: string;
  title: string | null;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  dateLabel: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments: Comment[];
  authorName: string;
  authorAvatarUrl: string;
  profileUrl: string;
};

type JournalGridProps = {
  entries: JournalGridEntry[];
  isOwner: boolean;
  isAuthenticated: boolean;
  /**
   * "feed" renders one full-width post per row, for the profile's main column.
   * "grid" keeps the original two-up masonry for wide, standalone listings.
   */
  layout?: "feed" | "grid";
};

export function JournalGrid({ entries, isOwner, isAuthenticated, layout = "grid" }: JournalGridProps) {
  return (
    <div className={layout === "feed" ? "space-y-5" : "grid gap-5 md:grid-cols-2"}>
      {entries.map((entry) => (
        <JournalCard key={entry.id} entry={entry} isOwner={isOwner} isAuthenticated={isAuthenticated} />
      ))}
    </div>
  );
}

function JournalCard({
  entry,
  isOwner,
  isAuthenticated,
}: {
  entry: JournalGridEntry;
  isOwner: boolean;
  isAuthenticated: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [mediaType, setMediaType] = useState<"photo" | "video">(entry.videoUrl ? "video" : "photo");

  function handleEdit(formData: FormData) {
    startEditTransition(async () => {
      await updateJournalEntryAction(entry.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteJournalEntryAction(entry.id);
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={entry.profileUrl} className="shrink-0">
          {entry.authorAvatarUrl ? (
            <img src={entry.authorAvatarUrl} alt={entry.authorName} className="h-9 w-9 rounded-full border border-border object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/10 text-sm font-bold text-sunset">
              {entry.authorName.charAt(0)}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={entry.profileUrl} className="text-sm font-semibold text-ink hover:text-sunset">{entry.authorName}</Link>
          <p className="text-xs text-muted">{entry.dateLabel}</p>
        </div>
        {isOwner ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing((v) => !v)} className="h-8 w-8 text-muted hover:text-ink">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-red-600">
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
        ) : isAuthenticated ? (
          <ReportJournalButton entryId={entry.id} />
        ) : null}
      </div>

      {editing ? (
        <form action={handleEdit} className="space-y-4 p-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
            <Input name="title" defaultValue={entry.title ?? ""} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Story</label>
            <Textarea name="body" rows={4} defaultValue={entry.body} className="mt-1" required />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Media</p>
            <div className="mt-1.5 flex gap-2">
              <button type="button" onClick={() => setMediaType("photo")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mediaType === "photo" ? "bg-sunset text-white" : "bg-canvas text-muted hover:text-ink"}`}>
                <ImagePlus className="h-3.5 w-3.5" /> Photo
              </button>
              <button type="button" onClick={() => setMediaType("video")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mediaType === "video" ? "bg-sunset text-white" : "bg-canvas text-muted hover:text-ink"}`}>
                <Link2 className="h-3.5 w-3.5" /> Video Link
              </button>
            </div>
          </div>
          {mediaType === "photo" ? (
            <>
              <Input name="ridePhoto" type="file" accept="image/png,image/jpeg,image/webp" />
              {entry.imageUrl && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input name="removePhoto" type="checkbox" className="rounded" /> Remove current photo
                </label>
              )}
            </>
          ) : (
            <Input name="videoUrl" type="url" defaultValue={entry.videoUrl ?? ""} placeholder="Paste YouTube, TikTok, Vimeo, or Instagram link" />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" variant="accent" size="sm" disabled={editPending}>{editPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-1 flex-col">
          {entry.imageUrl ? (
            <div className="aspect-[4/3] w-full overflow-hidden bg-asphalt">
              <img src={entry.imageUrl} alt={entry.title ?? "Ride"} className="h-full w-full object-cover" />
            </div>
          ) : entry.videoUrl ? (
            <VideoEmbed url={entry.videoUrl} />
          ) : null}

          {(entry.title || entry.body) && (
            <div className="px-4 pt-3">
              {/* Title on its own line as a heading — running it inline after the
                  author name (already in the header above) read as one phrase. */}
              {entry.title && (
                <h3 className="font-display text-base font-semibold text-ink">{entry.title}</h3>
              )}
              <p className="line-clamp-3 text-sm text-muted">
                <Linkify text={entry.body} />
              </p>
            </div>
          )}

          <div className="mt-auto">
            <JournalInteractions
              entryId={entry.id}
              likeCount={entry.likeCount}
              commentCount={entry.commentCount}
              isLiked={entry.isLiked}
              isAuthenticated={isAuthenticated}
              comments={entry.comments}
              entryUrl={entry.profileUrl}
            />
          </div>
        </div>
      )}
    </article>
  );
}
