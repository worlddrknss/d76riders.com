"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, registerAction } from "@/app/(site)/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

const initialAuthFormState: AuthFormState = {
  error: null,
};

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(registerAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Display Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="How your name appears publicly"
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
        />
        <p className="text-xs text-muted">Optional. If empty, your username will be shown.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9._-]+"
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
        />
        <p className="text-xs text-muted">3-24 chars, lowercase letters, numbers, ., _, -</p>
      </div>

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
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
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
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
        />
        <p className="text-xs text-muted">Use at least 8 characters.</p>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel="Create account" pendingLabel="Creating account..." />

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sunset hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
