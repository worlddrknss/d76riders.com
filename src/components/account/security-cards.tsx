"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  deleteAccountAction,
  type AccountFormState,
  type DeleteAccountFormState,
} from "@/app/(site)/account/actions";

const initial: AccountFormState = { error: null, success: null };
const deleteInitial: DeleteAccountFormState = { error: null };

/** Change password (requires the current one). */
export function PasswordChangeCard() {
  const [state, action, pending] = useActionState(
    async (_p: AccountFormState, fd: FormData) => changePasswordAction(_p, fd),
    initial,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl text-ink">Password</h2>
      <p className="mt-1 text-sm text-muted">Use at least 8 characters.</p>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-muted">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-asphalt/85 disabled:opacity-60"
          >
            {pending ? "Updating…" : "Update password"}
          </button>
          {state.success && <span className="text-sm text-forest">{state.success}</span>}
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}

/** Danger zone — permanently delete the account. */
export function DeleteAccountCard() {
  const [state, action] = useActionState(deleteAccountAction, deleteInitial);

  return (
    <div className="rounded-xl border border-red-500/30 bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-red-700">Danger Zone</h2>
      <p className="mt-2 text-sm text-muted">
        Permanently delete your account, profile, bikes, journal, and uploads. This can&apos;t be undone.
      </p>
      <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          name="confirmation"
          placeholder="Type DELETE to confirm"
          className="flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-red-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Account
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
