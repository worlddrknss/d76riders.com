"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { addVideoAction } from "@/app/(site)/videos/mine/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateVideoDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd(formData: FormData) {
    setError(null);
    const url = (formData.get("url") ?? "").toString().trim();
    if (!url) {
      setError("Paste a YouTube or TikTok URL.");
      return;
    }
    startTransition(async () => {
      try {
        await addVideoAction(formData);
        setOpen(false);
        router.refresh();
      } catch {
        setError("Couldn't add that video — check the link and try again.");
      }
    });
  }

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add Video
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Video</DialogTitle>
            <DialogDescription>Paste a YouTube or TikTok link — it&apos;ll embed on your profile.</DialogDescription>
          </DialogHeader>

          <form action={handleAdd} className="mt-4 space-y-3">
            <div>
              <label htmlFor="video-url" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Video URL *
              </label>
              <input
                id="video-url"
                name="url"
                type="url"
                required
                placeholder="https://youtube.com/watch?v=… or https://tiktok.com/…"
                className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="video-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Title (optional)
              </label>
              <input
                id="video-title"
                name="title"
                placeholder="e.g. Sunday canyon run"
                className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Adding…" : "Add Video"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
