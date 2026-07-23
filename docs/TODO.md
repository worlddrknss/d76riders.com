# Todo

What's actually left. The 15-phase implementation guide, the feature backlog and
the roadmap status doc were completed and removed — `git log -- docs/` has them
if you need what they said.

## Product

- [ ] Replace placeholder hero and gallery images with real community media
- [ ] Decide whether the static Gallery page should become upload-backed
- [ ] Route intelligence (was Phase 9, partial): route quality score from rider
      feedback, difficulty prediction from distance/elevation/pace history, and
      best-time-to-ride suggestions by season

## Platform

- [ ] Error tracking / observability — the last foundational gap. A Sentry-style
      tracker plus structured logging; would have surfaced the SMTP hang and the
      publish hang before a rider hit them.
- [ ] Grow the test suite — the harness exists (32 tests). Feed ranking and the
      rate limiter are the next worthwhile targets.
- [ ] Perf tail — the sequential awaits in `closeRideAction` and the S3 deletes
      could be bounded `Promise.all`.

## Scheduled

- [ ] 2026-09-01 — review the two accepted advisories in `scripts/audit-check.mjs`.
      Both are postcss/sharp bundled inside Next with no fix available. Run
      `npm run audit:check`; it flags an entry once it stops being reported.
