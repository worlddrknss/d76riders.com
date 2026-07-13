"use client";

import { useActionState } from "react";

import {
  type AccountFormState,
  type DeleteAccountFormState,
  deleteAccountAction,
  updateAccountProfileAction,
} from "@/app/(site)/account/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

type AccountProfileFormProps = {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  yearStartedRiding: number | null;
};

const initialAccountFormState: AccountFormState = {
  error: null,
  success: null,
};

const initialDeleteAccountFormState: DeleteAccountFormState = {
  error: null,
};

export function AccountProfileForm({ displayName, username, avatarUrl, bio, yearStartedRiding }: AccountProfileFormProps) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    updateAccountProfileAction,
    initialAccountFormState,
  );
  const [deleteState, deleteFormAction] = useActionState<DeleteAccountFormState, FormData>(
    deleteAccountAction,
    initialDeleteAccountFormState,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Display Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={displayName}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={username}
            required
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9._-]+"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="avatarUrl" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Avatar URL
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            defaultValue={avatarUrl}
            placeholder="https://..."
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="avatarFile" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Avatar Upload
          </label>
          <input
            id="avatarFile"
            name="avatarFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="coverFile" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Cover Photo
          </label>
          <p className="text-xs text-muted">Shown as the banner on your rider card and profile header.</p>
          <input
            id="coverFile"
            name="coverFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft file:mr-3 file:rounded-md file:border-0 file:bg-asphalt file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={bio}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="Tell riders about your preferred rides and pace."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="yearStartedRiding" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Year Started Riding
          </label>
          <input
            id="yearStartedRiding"
            name="yearStartedRiding"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            defaultValue={yearStartedRiding ?? undefined}
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="e.g. 2014"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            New Password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
            placeholder="Leave blank to keep current password"
          />
        </div>

        {state.error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.success}
          </p>
        ) : null}

        <AuthSubmitButton idleLabel="Save Profile" pendingLabel="Saving..." />
      </form>

      <div className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-red-700">Danger Zone</h2>
        <p className="mt-2 text-sm text-muted">
          Deleting your account removes your profile, garage, ride history, events, owned news posts, and all associated uploaded media.
        </p>
        <form action={deleteFormAction} className="mt-4 space-y-3">
          <input
            name="confirmation"
            type="text"
            placeholder="Type DELETE to confirm"
            className="w-full rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-ink focus:border-red-400 focus:outline-none"
          />
          {deleteState.error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteState.error}
            </p>
          ) : null}
          <button
            type="submit"
            className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-red-700 hover:bg-red-50"
          >
            Delete Account
          </button>
        </form>
      </div>
    </div>
  );
}
