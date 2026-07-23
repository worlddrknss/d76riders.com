# Todo

What's actually left. The 15-phase implementation guide, the feature backlog and
the roadmap status doc were completed and removed — `git log -- docs/` has them
if you need what they said.

## Product

- [ ] Replace placeholder hero and gallery images with real community media

## Platform

- [ ] Error tracking / observability — the last foundational gap. A Sentry-style
      tracker plus structured logging; would have surfaced the SMTP hang and the
      publish hang before a rider hit them.
- [ ] Grow the test suite — the harness exists (43 tests). Feed ranking and the
      rate limiter are the next worthwhile targets.

## Scheduled

- [ ] 2026-09-01 — review the two accepted advisories in `scripts/audit-check.mjs`.
      Both are postcss/sharp bundled inside Next with no fix available. Run
      `npm run audit:check`; it flags an entry once it stops being reported.
