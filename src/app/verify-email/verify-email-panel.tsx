"use client";

import { useActionState } from "react";

import { logoutAction } from "@/app/(site)/(auth)/actions";
import { resendVerificationAction, type ResendState } from "./actions";

const initial: ResendState = { sent: false, error: null };

export function VerifyEmailPanel({ email }: { email: string }) {
  const [state, resend, pending] = useActionState(async () => resendVerificationAction(), initial);

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-sunset/10 text-2xl">
        📬
      </div>
      <h1 className="text-xl font-bold text-asphalt">Confirm your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it to
        unlock your account. Check spam if it&apos;s not in your inbox.
      </p>

      {state.sent && (
        <p className="mt-4 rounded-lg border border-forest/30 bg-forest/10 px-3 py-2 text-sm text-forest">
          Sent — a fresh link is on its way.
        </p>
      )}
      {state.error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <form action={resend} className="mt-6">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Resend confirmation email"}
        </button>
      </form>

      <form action={logoutAction} className="mt-3">
        <button type="submit" className="w-full text-center text-xs text-muted hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  );
}
