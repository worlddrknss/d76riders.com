"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

import { CreateJournalDialog } from "@/components/profile/create-journal-dialog";

interface JournalComposerBarProps {
  avatarUrl: string | null;
  firstName: string;
  /** Full name, for the byline on the composer's live preview. */
  name: string;
}

export function JournalComposerBar({ avatarUrl, firstName, name }: JournalComposerBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-3 shadow-soft">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/20 text-sm font-semibold text-muted">
              {firstName.charAt(0)}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full bg-canvas px-4 py-2.5 text-left text-sm text-muted transition hover:bg-muted/10"
          >
            Where&apos;d you ride, {firstName}?
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg p-2 text-emerald-500 transition hover:bg-emerald-500/10"
            aria-label="Add photo"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <CreateJournalDialog
        open={open}
        onOpenChange={setOpen}
        authorName={name}
        authorAvatarUrl={avatarUrl}
      />
    </>
  );
}
