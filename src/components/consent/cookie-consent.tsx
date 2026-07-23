"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

import { readConsentCookie, subscribeConsent, writeConsentCookie } from "@/lib/consent";

/**
 * GDPR/ePrivacy cookie banner.
 *
 * Shown until the rider makes a choice. Accept and Reject sit side by side with
 * equal weight — consent isn't valid if refusing is harder than agreeing, so
 * there's no pre-ticked box and no dark-pattern "Reject" buried in a submenu.
 *
 * Rejecting keeps only the strictly-necessary session cookie; analytics stay
 * off. The choice can be changed later from the "Cookie settings" footer link,
 * which dispatches the same event this listens for.
 */
export function CookieConsent() {
  // The stored choice is external state (a cookie the footer link can also
  // clear), so useSyncExternalStore keeps it in sync without a render-phase
  // setState. The server snapshot is "decided" so the banner is never in the
  // SSR HTML — it appears on the client only when the rider hasn't chosen.
  const decided = useSyncExternalStore(
    subscribeConsent,
    () => readConsentCookie() !== null,
    () => true,
  );

  if (decided) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-white/12 bg-asphalt/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-sunset" />
          <p className="text-sm text-slate-200">
            We use a session cookie to keep you signed in, and — only if you allow it — analytics to see
            how the site is used. See our{" "}
            <Link href="/policies/privacy" className="font-semibold text-white underline hover:text-sunset">
              privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => writeConsentCookie("essential")}
            className="flex-1 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => writeConsentCookie("all")}
            className="flex-1 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26] sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
