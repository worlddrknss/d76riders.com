"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type ResetRequestState, requestPasswordResetAction } from "@/app/(site)/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialState: ResetRequestState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ResetRequestState, FormData>(requestPasswordResetAction, initialState);

  if (state.sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-forest/40 bg-forest/10 px-3 py-2 text-sm text-forest">
          If an account exists for that email, we&apos;ve sent a reset link. Check your inbox (and spam).
        </p>
        <p className="text-sm text-muted">
          <Link href="/login" className="font-semibold text-sunset hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-soft"
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel="Send reset link" pendingLabel="Sending..." />

      <p className="text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-sunset hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
