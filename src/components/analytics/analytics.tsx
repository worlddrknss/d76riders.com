"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";

import { readConsentCookie, subscribeConsent } from "@/lib/consent";

/**
 * Google Analytics, loaded only after the rider consents.
 *
 * The GA script tag is not rendered at all until consent is "all" — the strict
 * reading of ePrivacy, and simpler than Consent Mode: nothing from Google loads,
 * sets a cookie, or pings until the rider opts in, and it unloads on the next
 * navigation if they later reject.
 *
 * The measurement ID arrives as a prop from the root layout, which reads it
 * server-side at request time. Deliberately NOT a NEXT_PUBLIC_ var: those are
 * inlined into the client bundle during `next build`, so the value would be
 * frozen into the image and changing it would need a rebuild. As a prop it is a
 * true runtime setting — set GA_MEASUREMENT_ID in the cluster and restart.
 */
export function Analytics({ gaId }: { gaId?: string }) {
  const allowed = useSyncExternalStore(
    subscribeConsent,
    () => readConsentCookie() === "all",
    () => false,
  );

  if (!gaId || !allowed) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
