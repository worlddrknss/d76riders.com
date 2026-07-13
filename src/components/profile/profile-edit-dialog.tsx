"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  type AccountFormState,
  updateAccountProfileAction,
} from "@/app/(site)/account/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ProfileData = {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  location: string;
  favoriteRoad: string;
  yearStartedRiding: number | null;
  youtubeHandle: string;
  tiktokHandle: string;
  instagramHandle: string;
  twitterHandle: string;
};

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
};

const initialState: AccountFormState = { error: null, success: null };

export function ProfileEditDialog({ open, onOpenChange, profile }: ProfileEditDialogProps) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updateAccountProfileAction,
    initialState,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="mt-2 space-y-5">
          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-sunset">Identity</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ep-displayName" className="text-xs font-semibold uppercase tracking-wide text-muted">Display Name</label>
                <input id="ep-displayName" name="displayName" type="text" defaultValue={profile.displayName} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="ep-username" className="text-xs font-semibold uppercase tracking-wide text-muted">Username</label>
                <input id="ep-username" name="username" type="text" required minLength={3} maxLength={24} pattern="[a-z0-9._-]+" defaultValue={profile.username} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="ep-avatarUrl" className="text-xs font-semibold uppercase tracking-wide text-muted">Avatar URL</label>
              <input id="ep-avatarUrl" name="avatarUrl" type="url" defaultValue={profile.avatarUrl} placeholder="https://..." className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ep-avatarFile" className="text-xs font-semibold uppercase tracking-wide text-muted">Upload Avatar</label>
                <input id="ep-avatarFile" name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-asphalt file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
              </div>
              <div>
                <label htmlFor="ep-coverFile" className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Photo</label>
                <input id="ep-coverFile" name="coverFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-asphalt file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
              </div>
            </div>
          </fieldset>

          {/* About */}
          <fieldset className="space-y-3 border-t border-border pt-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-sunset">About</legend>
            <div>
              <label htmlFor="ep-bio" className="text-xs font-semibold uppercase tracking-wide text-muted">Bio</label>
              <textarea id="ep-bio" name="bio" rows={3} defaultValue={profile.bio} placeholder="Tell riders about your style and pace." className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ep-location" className="text-xs font-semibold uppercase tracking-wide text-muted">Location</label>
                <input id="ep-location" name="location" type="text" defaultValue={profile.location} placeholder="City, State" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="ep-favoriteRoad" className="text-xs font-semibold uppercase tracking-wide text-muted">Favorite Road</label>
                <input id="ep-favoriteRoad" name="favoriteRoad" type="text" defaultValue={profile.favoriteRoad} placeholder="e.g. Natchez Trace" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="w-1/2">
              <label htmlFor="ep-yearStartedRiding" className="text-xs font-semibold uppercase tracking-wide text-muted">Year Started Riding</label>
              <input id="ep-yearStartedRiding" name="yearStartedRiding" type="number" min={1900} max={new Date().getFullYear()} defaultValue={profile.yearStartedRiding ?? undefined} placeholder="2018" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
            </div>
          </fieldset>

          {/* Socials */}
          <fieldset className="space-y-3 border-t border-border pt-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-sunset">Social Links</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ep-youtubeUrl" className="text-xs font-semibold uppercase tracking-wide text-muted">YouTube</label>
                <input id="ep-youtubeUrl" name="youtubeUrl" type="text" defaultValue={profile.youtubeHandle} placeholder="@YourChannel" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="ep-tiktokUrl" className="text-xs font-semibold uppercase tracking-wide text-muted">TikTok</label>
                <input id="ep-tiktokUrl" name="tiktokUrl" type="text" defaultValue={profile.tiktokHandle} placeholder="@YourHandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="ep-instagramUrl" className="text-xs font-semibold uppercase tracking-wide text-muted">Instagram</label>
                <input id="ep-instagramUrl" name="instagramUrl" type="text" defaultValue={profile.instagramHandle} placeholder="yourhandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="ep-twitterUrl" className="text-xs font-semibold uppercase tracking-wide text-muted">X / Twitter</label>
                <input id="ep-twitterUrl" name="twitterUrl" type="text" defaultValue={profile.twitterHandle} placeholder="yourhandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
            </div>
          </fieldset>

          {state.error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
