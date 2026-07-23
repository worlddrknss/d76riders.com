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
 * Wired but dormant until NEXT_PUBLIC_GA_ID is set, so dropping in the measurement
 * ID is the only step left to turn analytics on — the consent gate already exists.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
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
