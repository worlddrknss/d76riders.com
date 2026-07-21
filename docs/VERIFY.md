# Roadmap — Status

_Reviewed 2026-07-20. ✅ done · 🟡 partial · ⬜ not started_

## 🔒 Security (do first) — ✅ COMPLETE

- ✅ **Rate limiting** — Postgres-backed, cross-replica, fails-open. On login (per-IP + per-account), register, password-reset, emergency-card alert, and hazard reports. _(v2.89.0)_
- ✅ **Server-action authorization audit** — Verified: every mutate-by-id action re-checks ownership/role; **no IDOR holes found**. Admin actions re-check roles at the action level.
- ✅ **Emergency-contact vault crypto review** — Verified sound: AES-256-GCM envelope encryption, fresh random IV per seal, auth-tag stored + verified.
- ✅ **Upload scanning** — Now **fails closed**: ClamAV enabled-but-unreachable blocks the upload instead of silently allowing. Dev (disabled) still passes. _(v2.90.0)_

### Bonus security/safety shipped this pass (from the deeper audit)
- ✅ **Password reset flow** — was entirely missing; users could get locked out. Single-use 1h token, no enumeration, revokes sessions. _(v2.88.0)_
- ✅ **Rider-down push** — emergency alert now pushes to organizers, bypassing quiet hours. _(v2.90.0)_

## ✨ Features (highest community value)

- 🟡 **Location-aware discovery** — ✅ required location/timezone at signup + geocoded rider coords; ✅ Events location dropdown + Nearest sort; ✅ Roads Nearest sort. ⬜ **Remaining: a map view of nearby events/roads.** _(v2.85–2.87)_
- ⬜ **Parts & gear marketplace / classifieds** — the #1 ask for moto communities; S3 uploads, garages, and messaging already exist to build on.
- ⬜ **Mentorship matching** — skill tracks + mentor trust level exist; pair new riders with nearby mentors.
- ✅ **Sub-communities → already shipped as Crews.** Crew + CrewMember (LEAD/MEMBER), open/closed join, crew-hosted events + challenges, `/crews` pages + admin. 🟡 _Only gap: crews have no location, so no "crews near me" — easy add now that riders have coords._
- ⬜ **Weather on ride pages** — surface conditions for an event's date/route.

## ⚙️ Enhancements (foundational health)

- ⬜ **Automated tests + CI gates** — still no test runner. Biggest long-term ROI: locks down authz ownership, reputation scoring, feed ranking, crypto.
- ⬜ **Error tracking / observability** — a Sentry-style tracker + structured logging would have surfaced the SMTP hang before a user hit it.
- ⬜ **Performance sweep** — top item: feed over-fetches all likes/saves per entry to compute per-viewer flags in JS (`lib/feed.ts`); one scoped query fixes it. Also sequential awaits in `closeRideAction` / S3 deletes.

## Next up (recommendation)

1. **Tests + CI gates** — protects everything just shipped; highest ROI.
2. **Feed perf fix** — small, self-contained win.
3. Then pick a feature: **marketplace** (biggest community pull) or **crews-near-me** (small, leverages the new coords).

## Follow Ups
Two follow-ups I flagged along the way:

1. **Marketplace contact**: "Message seller" reuses the platform's mutual-follow DM gate (falls back to the seller's profile). True buyer↔seller messaging without a follow needs the DM gate relaxed for listing contexts — a deliberate decision I left for you.

2. **Crews-near-me**: sub-communities still have no coordinates, so no proximity sorting for them yet (easy add now).