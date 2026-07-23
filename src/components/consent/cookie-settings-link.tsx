"use client";

import { CONSENT_COOKIE, CONSENT_EVENT } from "@/lib/consent";

/**
 * Reopens the cookie banner so a rider can change their mind — a GDPR
 * requirement: consent has to be as easy to withdraw as it was to give.
 * Clears the stored choice and re-fires the consent event the banner listens
 * for, rather than navigating anywhere.
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; samesite=lax`;
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
      }}
      className={className}
    >
      Cookie settings
    </button>
  );
}
