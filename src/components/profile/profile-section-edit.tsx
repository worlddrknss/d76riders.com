"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  type AccountFormState,
  updateAccountProfileAction,
} from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SectionType = "identity" | "details" | "socials";

type ProfileSectionData = {
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

type ProfileSectionEditProps = {
  section: SectionType;
  data: ProfileSectionData;
};

const initialState: AccountFormState = { error: null, success: null };

function SectionFields({ section, data }: { section: SectionType; data: ProfileSectionData }) {
  if (section === "identity") {
    return (
      <>
        <input type="hidden" name="username" value={data.username} />
        <input type="hidden" name="youtubeUrl" value={data.youtubeHandle} />
        <input type="hidden" name="tiktokUrl" value={data.tiktokHandle} />
        <input type="hidden" name="instagramUrl" value={data.instagramHandle} />
        <input type="hidden" name="twitterUrl" value={data.twitterHandle} />
        {data.yearStartedRiding && <input type="hidden" name="yearStartedRiding" value={data.yearStartedRiding} />}
        <input type="hidden" name="favoriteRoad" value={data.favoriteRoad} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Display Name</label>
          <input name="displayName" type="text" defaultValue={data.displayName} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Bio</label>
          <textarea name="bio" rows={3} defaultValue={data.bio} placeholder="Tell riders about your style." className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Location</label>
          <input name="location" type="text" defaultValue={data.location} placeholder="City, State" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Avatar URL</label>
          <input name="avatarUrl" type="url" defaultValue={data.avatarUrl} placeholder="https://..." className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Upload Avatar</label>
            <input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-asphalt file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cover Photo</label>
            <input name="coverFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-asphalt file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white" />
          </div>
        </div>
      </>
    );
  }

  if (section === "details") {
    return (
      <>
        <input type="hidden" name="displayName" value={data.displayName} />
        <input type="hidden" name="username" value={data.username} />
        <input type="hidden" name="bio" value={data.bio} />
        <input type="hidden" name="youtubeUrl" value={data.youtubeHandle} />
        <input type="hidden" name="tiktokUrl" value={data.tiktokHandle} />
        <input type="hidden" name="instagramUrl" value={data.instagramHandle} />
        <input type="hidden" name="twitterUrl" value={data.twitterHandle} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Location</label>
            <input name="location" type="text" defaultValue={data.location} placeholder="City, State" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Favorite Road</label>
            <input name="favoriteRoad" type="text" defaultValue={data.favoriteRoad} placeholder="e.g. Natchez Trace" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="w-1/2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Year Started Riding</label>
          <input name="yearStartedRiding" type="number" min={1900} max={new Date().getFullYear()} defaultValue={data.yearStartedRiding ?? undefined} placeholder="2018" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
      </>
    );
  }

  // socials
  return (
    <>
      <input type="hidden" name="displayName" value={data.displayName} />
      <input type="hidden" name="username" value={data.username} />
      <input type="hidden" name="bio" value={data.bio} />
      <input type="hidden" name="location" value={data.location} />
      <input type="hidden" name="favoriteRoad" value={data.favoriteRoad} />
      {data.yearStartedRiding && <input type="hidden" name="yearStartedRiding" value={data.yearStartedRiding} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">YouTube</label>
          <input name="youtubeUrl" type="text" defaultValue={data.youtubeHandle} placeholder="@YourChannel" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">TikTok</label>
          <input name="tiktokUrl" type="text" defaultValue={data.tiktokHandle} placeholder="@YourHandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Instagram</label>
          <input name="instagramUrl" type="text" defaultValue={data.instagramHandle} placeholder="yourhandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">X / Twitter</label>
          <input name="twitterUrl" type="text" defaultValue={data.twitterHandle} placeholder="yourhandle" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
        </div>
      </div>
    </>
  );
}

const sectionTitles: Record<SectionType, string> = {
  identity: "Edit Profile",
  details: "Edit Details",
  socials: "Edit Socials",
};

export function ProfileSectionEdit({ section, data }: ProfileSectionEditProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updateAccountProfileAction,
    initialState,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      setOpen(false);
    }
  }, [state.success, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-muted transition hover:bg-canvas hover:text-sunset"
        title={sectionTitles[section]}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{sectionTitles[section]}</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={formAction} className="mt-3 space-y-4">
            <SectionFields section={section} data={data} />

            {state.error ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
