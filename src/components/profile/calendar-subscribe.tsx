"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, RefreshCw } from "lucide-react";

import { rotateCalendarTokenAction } from "@/app/(site)/account/actions";

/**
 * The rider's personal ride calendar: a subscribe URL their calendar app polls,
 * so RSVP'd rides land on their phone and stay in sync. Null token → they
 * haven't made one yet; regenerating rotates it and breaks old subscriptions.
 */
export function CalendarSubscribe({
  webcalUrl,
  httpsUrl,
}: {
  webcalUrl: string | null;
  httpsUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const rotate = () => start(async () => { await rotateCalendarTokenAction(); });

  const copy = async () => {
    if (!httpsUrl) return;
    await navigator.clipboard.writeText(httpsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Calendar</p>
      <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <CalendarClock className="h-5 w-5 text-sunset" />
        Sync your rides
      </h2>
      <p className="mt-2 text-sm text-muted">
        Subscribe once and every ride you RSVP to shows up in Google, Apple, or Outlook Calendar, times
        already in your zone. Keep this link private — anyone with it can see your upcoming rides.
      </p>

      {webcalUrl && httpsUrl ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <a
              href={webcalUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
            >
              <CalendarClock className="h-4 w-4" />
              Subscribe
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset"
            >
              {copied ? <Check className="h-4 w-4 text-forest" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <input
            readOnly
            value={httpsUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-muted"
          />
          <button
            type="button"
            onClick={rotate}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-red-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Regenerate link (breaks existing subscriptions)
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={rotate}
          disabled={pending}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
        >
          <CalendarClock className="h-4 w-4" />
          {pending ? "Creating…" : "Create calendar link"}
        </button>
      )}
    </div>
  );
}
