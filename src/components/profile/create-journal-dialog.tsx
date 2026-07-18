"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { createJournalEntryAction, type JournalFormState } from "@/app/(site)/r/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initial: JournalFormState = { error: null, success: null };

interface CreateJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJournalDialog({ open, onOpenChange }: CreateJournalDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [state, action, pending] = useActionState(async (_prev: JournalFormState, formData: FormData) => {
    return createJournalEntryAction(_prev, formData);
  }, initial);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onOpenChange(false);
    formRef.current?.reset();
    setMediaType("photo");
    router.refresh();
  }, [router, state.success, onOpenChange]);

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Ride Journal Entry</DialogTitle>
            <DialogDescription>Share a ride story with the community.</DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={action} className="mt-4 space-y-4">
            <div>
              <label htmlFor="create-title" className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
              <Input id="create-title" name="title" placeholder="Give it a name" className="mt-1" />
            </div>
            <div>
              <label htmlFor="create-body" className="text-xs font-semibold uppercase tracking-wide text-muted">Story</label>
              <MentionTextarea id="create-body" name="body" rows={4} placeholder="How did the ride go? Use #tags and @mention riders" className="mt-1" required />
            </div>

            {/* Media type toggle */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Media (optional)</p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("photo")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mediaType === "photo"
                      ? "bg-sunset text-white"
                      : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Photo
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mediaType === "video"
                      ? "bg-sunset text-white"
                      : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" /> Video Link
                </button>
              </div>
            </div>

            {mediaType === "photo" ? (
              <div>
                <Input id="create-photo" name="ridePhoto" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
            ) : (
              <div>
                <Input
                  id="create-video"
                  name="videoUrl"
                  type="url"
                  placeholder="Paste YouTube, TikTok, Vimeo, or Instagram link"
                />
                <p className="mt-1 text-[0.65rem] text-muted">Supports YouTube, TikTok, Vimeo, Instagram, and Facebook</p>
              </div>
            )}

            <AnimatePresence>
              {state.error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-red-600"
                >
                  {state.error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}
