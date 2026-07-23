"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { ProfileEditDialog, type ProfileData } from "@/components/profile/profile-edit-dialog";

// Reuses the dialog's own type rather than restating it — the two drifting is
// what let a new required field compile here and fail there.
type ProfileEditButtonProps = {
  profile: ProfileData;
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
