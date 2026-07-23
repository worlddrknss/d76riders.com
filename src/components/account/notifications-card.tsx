"use client";

import { useActionState } from "react";

import {
  requestEmailChangeAction,
  updateNotificationPrefsAction,
  type AccountFormState,
} from "@/app/(site)/account/actions";
import {
  CHANNEL_LABELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
} from "@/lib/notification-catalog";

const initial: AccountFormState = { error: null, success: null };

/** Change the account email (Account page). Confirms at the new address first. */
export function EmailChangeCard({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const [state, changeEmail, pending] = useActionState(
    async (_p: AccountFormState, fd: FormData) => requestEmailChangeAction(_p, fd),
    initial,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl text-ink">Email address</h2>
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
export function NotificationPrefsCard({ disabledRoutes }: { disabledRoutes: string[] }) {
  const [state, savePrefs, pending] = useActionState(
    async (_p: AccountFormState, fd: FormData) => updateNotificationPrefsAction(_p, fd),
    initial,
  );

  // Stored rows are opt-outs, so anything not listed is on.
  const off = new Set(disabledRoutes);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl text-ink">Notifications</h2>
      <p className="mt-1 text-sm text-muted">
        Pick where each kind of alert reaches you. In-app lands in your alerts inbox, push goes to your
        phone or desktop, email to your inbox.
      </p>

      <form action={savePrefs} className="mt-5 space-y-3">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <div key={category.key} className="rounded-lg border border-border bg-canvas px-4 py-3">
            <p className="text-sm font-medium text-ink">{category.label}</p>
            <p className="mt-0.5 text-xs text-muted">{category.hint}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {NOTIFICATION_CHANNELS.map((channel) => {
                const available = category.channels.includes(channel);
                if (!available) return null;
                const route = `${category.key}:${channel}`;
                return (
                  <ChannelToggle
                    key={channel}
                    name={`notify:${route}`}
                    label={CHANNEL_LABELS[channel]}
                    defaultOn={!off.has(route)}
                  />
                );
              })}
            </div>
          </div>
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

      <p className="mt-4 text-xs text-muted">
        Rider-down alerts always reach ride organizers on every channel. Safety isn&apos;t a preference.
      </p>
    </div>
  );
}

/**
 * A switch, not a checkbox — it reads as on/off at a glance across a row of
 * three, which a row of ticks doesn't.
 *
 * Still a real checkbox underneath, so it posts with the form, works without
 * JavaScript and is keyboard- and screen-reader-native; only the visuals are
 * custom, driven by peer-checked.
 */
function ChannelToggle({
  name,
  label,
  defaultOn,
}: {
  name: string;
  label: string;
  defaultOn: boolean;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
      <input type="checkbox" name={name} defaultChecked={defaultOn} className="peer sr-only" />
      {/* Track and knob are both siblings of the input. peer-checked: compiles to
          `.peer:checked ~ &`, so a knob nested inside the track would never
          move — it wouldn't be a sibling of the checkbox. */}
      <span className="h-5 w-9 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-sunset peer-focus-visible:ring-2 peer-focus-visible:ring-sunset/50" />
      <span className="pointer-events-none absolute left-[0.9rem] h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      <span className="text-xs font-semibold text-muted transition-colors peer-checked:text-ink">{label}</span>
    </label>
  );
}
