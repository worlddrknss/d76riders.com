"use client";

import { useActionState, useState } from "react";
import {
  AtSign,
  Bell,
  CalendarClock,
  ChevronDown,
  Mail,
  Megaphone,
  MessageCircle,
  Newspaper,
  Smartphone,
  UserCheck,
} from "lucide-react";

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
import type { NotificationCategory, NotificationChannel } from "@/lib/notification-catalog";

const CATEGORY_ICONS: Partial<Record<NotificationCategory, typeof Bell>> = {
  mention: AtSign,
  comment: MessageCircle,
  rsvp: UserCheck,
  event: Megaphone,
  rideChange: CalendarClock,
  reminder: Bell,
  weeklyRecap: Newspaper,
};

const CHANNEL_ICONS: Record<NotificationChannel, typeof Bell> = {
  inApp: Bell,
  push: Smartphone,
  email: Mail,
};

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

  // Stored rows are opt-outs, so anything not listed is on. Held in state rather
  // than read off the DOM so each row's summary updates as you flip a switch.
  const [off, setOff] = useState<Set<string>>(() => new Set(disabledRoutes));
  const [openKey, setOpenKey] = useState<string | null>(null);

  function toggle(route: string, on: boolean) {
    setOff((prev) => {
      const next = new Set(prev);
      if (on) next.delete(route);
      else next.add(route);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border p-6 sm:p-8">
        <h2 className="font-display text-xl text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Pick where each kind of alert reaches you. In-app lands in your alerts inbox, push goes to your
          phone or desktop, email to your inbox.
        </p>
      </div>

      <form action={savePrefs}>
        <div className="divide-y divide-border">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.key] ?? Bell;
            const isOpen = openKey === category.key;
            const enabled = category.channels.filter((ch) => !off.has(`${category.key}:${ch}`));
            const summary = enabled.length
              ? enabled.map((ch) => CHANNEL_LABELS[ch]).join(", ")
              : "Off";

            return (
              <div key={category.key}>
                {/* Collapsed row: what it is, and where it currently goes. */}
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : category.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-canvas sm:px-8"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{category.label}</span>
                    <span
                      className={`block text-xs ${enabled.length ? "text-muted" : "font-semibold text-muted/70"}`}
                    >
                      {summary}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen ? (
                  <div className="px-6 pb-5 sm:px-8">
                    <p className="text-sm text-muted">{category.hint}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Where you receive these
                    </p>
                    <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                      {NOTIFICATION_CHANNELS.filter((ch) => category.channels.includes(ch)).map((channel) => {
                        const route = `${category.key}:${channel}`;
                        const ChannelIcon = CHANNEL_ICONS[channel];
                        return (
                          <label
                            key={channel}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3"
                          >
                            <ChannelIcon className="h-4 w-4 shrink-0 text-muted" />
                            <span className="flex-1 text-sm text-ink">{CHANNEL_LABELS[channel]}</span>
                            <Switch
                              name={`notify:${route}`}
                              checked={!off.has(route)}
                              onChange={(on) => toggle(route, on)}
                              label={`${CHANNEL_LABELS[channel]} for ${category.label}`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border p-6 sm:p-8">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white hover:bg-sunset/85 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save preferences"}
          </button>
          {state.success && <span className="text-sm text-forest">{state.success}</span>}
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          <p className="w-full text-xs text-muted">
            Rider-down alerts always reach ride organizers on every channel. Safety isn&apos;t a preference.
          </p>
        </div>
      </form>
    </div>
  );
}

/**
 * A switch that still posts with the form.
 *
 * The visible track is a div and the real checkbox is visually hidden inside the
 * same label — so it submits, and stays keyboard- and screen-reader-native,
 * while the appearance is driven by React state rather than :checked. That
 * matters here because the collapsed row's "In-app, Push, Email" summary has to
 * update the moment a switch flips, which needs the value in state anyway.
 */
function Switch({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={`h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-sunset/50 ${
          checked ? "bg-sunset" : "bg-border"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[1.4rem]" : "left-0.5"
        }`}
      />
    </span>
  );
}
