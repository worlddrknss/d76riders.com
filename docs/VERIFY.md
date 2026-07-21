# Roadmap — Status

_Reviewed 2026-07-21. ✅ done · 🟡 partial · ⬜ not started · Live at v2.98.0_

## 🔒 Security — ✅ COMPLETE

- ✅ **Rate limiting** — Postgres-backed, cross-replica, fails-open. On login (per-IP + per-account), register, password-reset, emergency-card alert, and hazard reports. _(v2.89.0)_
- ✅ **Server-action authorization audit** — Verified: every mutate-by-id action re-checks ownership/role; **no IDOR holes found**. Admin actions re-check roles at the action level.
- ✅ **Emergency-contact vault crypto review** — Verified sound: AES-256-GCM envelope encryption, fresh random IV per seal, auth-tag stored + verified.
- ✅ **Upload scanning fails closed** — ClamAV enabled-but-unreachable now blocks the upload instead of silently allowing. Dev (disabled) still passes. _(v2.90.0)_
- ✅ **Password reset flow** — was entirely missing. Single-use 1h token, no enumeration, revokes sessions. _(v2.88.0)_
- ✅ **Rider-down push** — emergency alert pushes to organizers, bypassing quiet hours. _(v2.90.0)_

## ✨ Features

- ✅ **Location-aware discovery** — required location/timezone at signup + geocoded rider coords; Events location dropdown + Nearest sort; Roads Nearest sort; **/nearby map** of nearby events + roads. Geocode also runs on profile save. _(v2.85–2.87, map v2.91.0)_
- ✅ **Marketplace / classifieds (MVP)** — Listing + ListingImage schema; create (scanned, rate-limited image upload) / mark-sold / relist / delete; `/marketplace` (search + category + sold filters), detail (gallery, seller, "Message seller"), and post form; nav link. _(v2.94.0)_
- ✅ **Sub-communities** — renamed **Crews → Sub-communities** (labels + `/crews`→`/sub-communities` with redirects; model stays internal). Default sub-communities are now **city-based**: Clarksville, Nashville, Knoxville, Chattanooga, Memphis, each with coordinates so the listing sorts **nearest-first** for signed-in riders (distance shown per card). _(v2.92.0, near-me v2.99.0)_
- ✅ **Marketplace buyer↔seller DMs** — "Message seller" now opens a real buyer↔seller thread without a mutual follow. The listing is the invitation: it marks the conversation **open-contact** so follow-up sends bypass the DM gate. Normal DMs still require a mutual follow (unfollow still ends them). _(v2.99.0)_
- ✅ **Mentorship matching** — `/mentors` lists riders who've earned mentor level, one card per rider with the skills they mentor + a verified check, sorted **nearest-first** by rider coordinates. Nav link added. _(v2.97.0)_
- ✅ **Weather on ride pages** — Open-Meteo (free, no API key). Events show a ride-day forecast in "About this ride"; roads show current conditions. Best-effort + hour-cached. _(v2.95.1)_

## ⚙️ Enhancements

- ✅ **Feed performance** — feed no longer over-fetches every like/save per entry; two indexed, viewer-scoped lookups instead. _(v2.93.0)_
- ✅ **Automated tests + CI gates** — Vitest suite (14 tests): trust scoring math + level gates, emergency vault crypto (round-trip/tamper), password hashing, elevation + price formatting. `ci.yml` runs lint + test + build on every push to main and PR (blocking). _(v2.98.0)_
- ⬜ **Error tracking / observability** — a Sentry-style tracker + structured logging (would have surfaced the SMTP hang, and sped up the publish-hang diagnosis, before a user hit them).
- ✅ **Error boundaries** — `error.tsx` (app-wide recovery), `global-error.tsx` (root-layout failures), and a branded `not-found.tsx`. No more raw framework crash screen. _(v2.96.0)_
- 🟡 **Perf tail** — sequential awaits in `closeRideAction` / S3 deletes could be bounded `Promise.all`.

## 🛠️ Incidents & fixes (2026-07-20)

- ✅ **Publish hang / "page couldn't load"** — root cause was **Cloudflare's Managed WAF rule "React – Leaking Server Functions" (CVE-2025-55183)**, auto-enabled on the zone that day, false-positive-blocking legitimate Next.js Server-Action POSTs. **Not our code** — proven by end-to-end tests (app, Envoy, full Cloudflare path all handled uploads fine). Resolved via a scoped WAF **Skip** custom rule (matches the `next-action` header) + confirmed the app is **already patched** (Next 16.2.9 + React 19.2.4). Also hardened along the way: S3 client timeouts, `bodySizeLimit` 30→75MB, upload try/catch. _(v2.94.1–2)_
- ✅ **Feed didn't update after publish** — `FeedList` seeded items from `useState` and ignored `router.refresh()`; now re-seeds on the server's first-page change, and the create action revalidates `/feed`. _(v2.94.3)_
- ✅ **SMTP outbound blocked** — cluster NetworkPolicy had no egress for 465/587; added it (infra repo) + app-side send timeouts so a mail outage can't hang registration. _(earlier)_
- ✅ **MinIO upload hangs** — ruled out during the publish-hang hunt; MinIO/S3 confirmed healthy.

## Next up (recommendation)

1. **Observability** — a Sentry-style error tracker + structured logging is the last foundational gap (error boundaries + tests are done; this closes the loop on catching issues before users do).
2. **Grow the test suite** — the harness exists now; add tests around feed ranking and the rate limiter next.
3. ✅ Small features: **sub-communities-near-me** + **marketplace buyer↔seller DMs** — both shipped in v2.99.0.

## Follow-ups still open

1. ✅ **Marketplace harassment control** — riders can now **block** each other from the DM thread (`RiderBlock`); a block in either direction ends messaging both ways, overriding open-contact, and swaps the composer for a notice. _(v2.113.0)_
