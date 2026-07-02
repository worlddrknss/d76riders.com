"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, loginAction } from "@/app/(site)/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialAuthFormState: AuthFormState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, initialAuthFormState);

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

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-soft"
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel="Log in" pendingLabel="Logging in..." />

      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/join" className="font-semibold text-sunset hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
