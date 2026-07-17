"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { ProfileEditDialog } from "@/components/profile/profile-edit-dialog";

type ProfileEditButtonProps = {
  profile: {
    displayName: string;
    username: string;
    avatarUrl: string;
    bio: string;
    location: string;
    timezone: string | null;
    favoriteRoad: string;
    yearStartedRiding: number | null;
    youtubeHandle: string;
    tiktokHandle: string;
    instagramHandle: string;
    twitterHandle: string;
  };
};

export function ProfileEditButton({ profile }: ProfileEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-asphalt transition hover:border-asphalt"
      >
        <Pencil className="h-3 w-3" />
        Edit Profile
      </button>
      <ProfileEditDialog open={open} onOpenChange={setOpen} profile={profile} />
    </>
  );
}
