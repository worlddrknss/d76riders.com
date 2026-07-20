🔒 Security (do first)
Rate limiting — Today's SMTP incident exposed that registration/login/email have no throttle. A script could hammer signup (each triggers a Gmail send) or brute-force login. Add per-IP/per-account rate limiting on auth + email + hazard/report creation. Highest-leverage security fix.
Server-action authorization audit — RSC server actions mutate by id; need to confirm every one checks ownership/role (the audit is verifying this now).
Emergency-contact vault crypto review — it holds real safety data under EMERGENCY_MASTER_KEY; worth a hard look at the encrypt/decrypt implementation.
Upload scanning — confirm ClamAV scanning is actually enforced, not bypassable when MALWARE_SCAN_MODE=off.

✨ Features (highest community value)
Finish location-aware discovery — near-me on Roads (Phase 3, already queued), plus a map view of nearby events/roads. You're 60% there.
Parts & gear marketplace / classifieds — the #1 thing motorcycle communities ask for; you already have S3 uploads, garages, and messaging to build on.
Mentorship matching — you have skill tracks + a mentor trust level; pair new riders with nearby mentors automatically. Ties directly into the "all riders, all skill levels" brand.
Sub-communities — as you grow past Clarksville, riders will want regional groups. The location data you just added is the foundation. <- is this already crews?
Weather on ride pages — a safety-forward community should surface conditions for an event's date/route.

⚙️ Enhancements (foundational health)
Automated tests + CI gates — I suspect there's no test suite. At this size (auth, reputation scoring, feed ranking, payments-adjacent trust), critical-path tests would catch regressions the manual tsc/lint/build gate can't. Biggest long-term ROI.
Error tracking / observability — today's SMTP hang was invisible until a user hit it. A Sentry-style error tracker + structured logging would surface these proactively.
Performance sweep — N+1 Prisma queries and unbounded findMany calls (the audit is checking hot paths).
