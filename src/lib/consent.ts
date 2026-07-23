/**
 * Cookie-consent state, shared by the banner and the analytics loader.
 *
 * Two buckets only: strictly-necessary cookies (session auth — always on, exempt
 * from consent under ePrivacy) and analytics (Google Analytics — off until the
 * rider opts in). Consent is stored in a first-party cookie so it survives
 * reloads and can be read on the server if ever needed.
 */

export const CONSENT_COOKIE = "d76-consent";

/** "all" = analytics allowed; "essential" = necessary cookies only. */
export type ConsentChoice = "all" | "essential";

/** Fired when the choice changes, so the analytics loader reacts without a reload. */
export const CONSENT_EVENT = "d76:consent-changed";

/** A year — long enough not to nag, short enough to re-ask eventually. */
export const CONSENT_MAX_AGE_DAYS = 365;

export function readConsentCookie(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === "all" || value === "essential" ? value : null;
}

export function writeConsentCookie(choice: ConsentChoice): void {
  if (typeof document === "undefined") return;
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${CONSENT_COOKIE}=${choice}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}

/** Subscribe to consent changes; for useSyncExternalStore. */
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}
