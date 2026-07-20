"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type ResetPasswordState, resetPasswordAction } from "@/app/(site)/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialState: ResetPasswordState = { error: null };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-soft"
        />
        <p className="text-xs text-muted">Use at least 8 characters.</p>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel="Set new password" pendingLabel="Saving..." />

      <p className="text-sm text-muted">
        <Link href="/login" className="font-semibold text-sunset hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
