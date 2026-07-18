"use client";

import { useActionState } from "react";

import {
  requestEmailChangeAction,
  updateNotificationPrefsAction,
  type AccountFormState,
} from "@/app/(site)/account/actions";

const initial: AccountFormState = { error: null, success: null };

type Prefs = { emailOnMention: boolean; emailOnComment: boolean; emailOnRsvp: boolean };

const TOGGLES: { name: keyof Prefs; label: string; hint: string }[] = [
  { name: "emailOnMention", label: "Mentions", hint: "When another rider @mentions you in a journal post." },
  { name: "emailOnComment", label: "Comments", hint: "When someone comments on your journal post." },
  { name: "emailOnRsvp", label: "RSVPs", hint: "When a rider RSVPs to a ride you organize." },
];

/** Change the account email (Account page). Confirms at the new address first. */
export function EmailChangeCard({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const [state, changeEmail, pending] = useActionState(
    async (_p: AccountFormState, fd: FormData) => requestEmailChangeAction(_p, fd),
    initial,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">Email address</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted">
        <span className="text-ink">{email}</span>
        {emailVerified ? (
          <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">Verified</span>
        ) : (
          <span className="rounded-full bg-sunset/10 px-2 py-0.5 text-xs font-medium text-sunset">Unverified</span>
        )}
      </p>

      <form action={changeEmail} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="new-email" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Change email
          </label>
          <input
            id="new-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-asphalt/85 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send confirmation"}
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        We&apos;ll email a confirmation link to the new address. Your email changes only after you click it.
      </p>
      {state.success && (
        <p className="mt-3 rounded-lg border border-forest/30 bg-forest/10 px-3 py-2 text-sm text-forest">{state.success}</p>
      )}
      {state.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}

/** Email notification opt-outs (Settings page). */
export function NotificationPrefsCard({ prefs }: { prefs: Prefs }) {
  const [state, savePrefs, pending] = useActionState(
    async (_p: AccountFormState, fd: FormData) => updateNotificationPrefsAction(_p, fd),
    initial,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">Email notifications</h2>
      <p className="mt-1 text-sm text-muted">Choose which activity sends you an email.</p>

      <form action={savePrefs} className="mt-4 space-y-3">
        {TOGGLES.map((t) => (
          <label
            key={t.name}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-canvas px-4 py-3"
          >
            <input
              type="checkbox"
              name={t.name}
              defaultChecked={prefs[t.name]}
              className="mt-0.5 h-4 w-4 rounded accent-sunset"
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t.label}</span>
              <span className="block text-xs text-muted">{t.hint}</span>
            </span>
          </label>
        ))}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white hover:bg-sunset/85 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save preferences"}
          </button>
          {state.success && <span className="text-sm text-forest">{state.success}</span>}
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
