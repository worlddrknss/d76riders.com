"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BellRing, MoonStar } from "lucide-react";

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  updateQuietHoursAction,
} from "@/app/(site)/settings/push-actions";

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

function hourLabel(h: number): string {
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12} ${h < 12 ? "AM" : "PM"}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function PushSettingsCard({
  vapidPublicKey,
  initialQuietStart,
  initialQuietEnd,
}: {
  vapidPublicKey: string | null;
  initialQuietStart: number | null;
  initialQuietEnd: number | null;
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quietStart, setQuietStart] = useState<number | null>(initialQuietStart);
  const [quietEnd, setQuietEnd] = useState<number | null>(initialQuietEnd);
  const [savingQuiet, startQuiet] = useTransition();

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(vapidPublicKey);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [vapidPublicKey]);

  const enable = useCallback(async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications are blocked in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
      });
      const json = sub.toJSON();
      await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
    } catch {
      setError("Could not enable push on this device.");
    } finally {
      setBusy(false);
    }
  }, [vapidPublicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("Could not turn off push on this device.");
    } finally {
      setBusy(false);
    }
  }, []);

  function saveQuiet(start: number | null, end: number | null) {
    setQuietStart(start);
    setQuietEnd(end);
    startQuiet(async () => {
      // Off unless both ends are set.
      await updateQuietHoursAction(start != null && end != null ? start : null, start != null && end != null ? end : null);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <BellRing className="h-5 w-5 text-sunset" /> Push notifications
      </h2>
      <p className="mt-1 text-sm text-muted">
        Get waves, comments, mentions, and RSVPs pushed to this device — even when the site is closed.
      </p>

      <div className="mt-4">
        {!supported ? (
          <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-muted">
            {vapidPublicKey
              ? "This browser doesn't support push notifications."
              : "Push isn't available yet — check back soon."}
          </p>
        ) : subscribed ? (
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">On for this device</span>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              {busy ? "…" : "Turn off"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white hover:bg-[#cf5a26] disabled:opacity-60"
          >
            {busy ? "Enabling…" : "Enable on this device"}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Quiet hours */}
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MoonStar className="h-4 w-4 text-asphalt" /> Quiet hours
          {savingQuiet && <span className="text-xs font-normal text-muted">saving…</span>}
        </h3>
        <p className="mt-1 text-xs text-muted">
          Hold pushes overnight (Central). Held notifications arrive as one digest when quiet hours end.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select
            value={quietStart ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              saveQuiet(v, v == null ? null : quietEnd ?? 7);
            }}
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-ink focus:border-sunset focus:outline-none"
          >
            <option value="">Off</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                From {hourLabel(h)}
              </option>
            ))}
          </select>
          {quietStart != null && (
            <select
              value={quietEnd ?? 7}
              onChange={(e) => saveQuiet(quietStart, Number(e.target.value))}
              className="rounded-lg border border-border bg-canvas px-3 py-2 text-ink focus:border-sunset focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  to {hourLabel(h)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
