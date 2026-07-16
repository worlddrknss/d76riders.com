# Implementation Phases

Organized from quickest to implement, based on existing infrastructure and dependencies.

## Status

| Phase | Title | Status |
| --- | --- | --- |
| 1 | Event Organizer Roles | ✅ Done |
| 2 | Live Check-In / Check-Out | ✅ Done |
| 3 | Emergency Contact Card | ✅ Done |
| 4 | NFC Emergency ID Page | ✅ Done |
| 5 | Route Hazard Reporting | ⬜ Not started |
| 6 | Rider Down Quick Alert | ✅ Done |
| 7 | Waitlist and RSVP Enhancements | ✅ Done |
| 8 | Batch Messaging to RSVP Riders | ✅ Done |
| 9 | Route Intelligence | ⬜ Not started |
| 10 | Rider Reputation and Progression | ✅ Done |
| 11 | Community Growth | ✅ Done |
| 12 | Media and Storytelling | ⬜ Not started |
| 13 | Admin and Moderation Enhancements | ✅ Done |
| 14 | Platform Reliability and Insights | ⬜ Not started |
| 15 | Challenges | ⬜ Not started |

Remaining, in the order they'd be quickest to build: **15 → 5 → 14 → 9 → 12**.

Effort is judged against what's actually in the codebase now, not against the original ordering — Phases 10/11/13 left substrate behind that changes the picture:

- **15 — Challenges.** Two models and a page, but the hard part is done: `EventCheckIn`,
  `RiderTrust.milesRidden`, and the badge-criteria engine in `src/lib/reputation.ts` already compute
  everything a challenge scores on.
- **5 — Hazard Reporting.** One model and an activity type, but new map-overlay UI and a TTL story.
- **14 — Reliability.** Mostly greenfield: there is no service worker or manifest today.
- **9 — Route Intelligence.** Needs an elevation source and a second routing profile; `Route` has no
  elevation field and `src/lib/routing.ts` only calls OSRM's plain `driving` profile.
- **12 — Media.** Largest: moderation queue, voting, and recap generation are three features in a coat.

### Follow-ups from the 10/11/13 work

- **Write and publish the safety waiver** at `/admin/policies` (type `SAFETY_WAIVER`). It is deliberately not
  seeded — it carries legal weight and needs real wording, not generated text. Until one exists, the Safety
  First badge and its 15 trust points are unearnable, which is correct rather than broken.
- **Badge tier colours** (bronze/silver/gold/platinum) intentionally sit outside the two-colour brand palette,
  since medal semantics need four distinct hues.
- Terminology: District 76 is a **community**, never a "club", "MC", or "RC" — see `/about`.

---

## Phase 1: Event Organizer Roles ✅

**Effort:** Small — one new model, minor event page updates.

**What exists:** Events have a single `hostId` on `RideEvent`. RSVP system, event QR codes, and event management actions are all in place.

**Work:**

- [x] Add `EventOrganizer` model (eventId, riderId, role enum: HOST, LEAD, SWEEP, MARSHAL)
- [x] Migration: backfill existing events — create an EventOrganizer HOST row from each event's hostId
- [x] Event creation: auto-insert HOST organizer for the creator
- [x] Event page: add organizer management UI for HOST (search riders, assign role, remove)
- [x] Authorization: all organizer roles can edit event, manage RSVPs
- [x] Display organizer names and roles on event page

**Schema:**

```prisma
model EventOrganizer {
  id      String             @id @default(cuid())
  eventId String
  riderId String
  role    EventOrganizerRole

  event RideEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rider Rider     @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([eventId, riderId])
}

enum EventOrganizerRole {
  HOST
  LEAD
  SWEEP
  MARSHAL
}
```

---

## Phase 2: Live Check-In / Check-Out ✅

**Effort:** Small-medium — one new model, context-aware UI on existing event page.

**Depends on:** Phase 1 (organizers need to see the attendance panel).

**What exists:** Event page with QR code, RSVP system, event status tracking.

**Work:**

- [x] Add `EventCheckIn` model (riderId, eventId, checkInAt, checkOutAt, method)
- [x] Event page: show "Check In" button when event is today + rider has RSVP + not yet checked in
- [x] Event page: show "Check Out" button after check-in
- [x] Organizer attendance panel: live list of who checked in, who hasn't, timestamps
- [x] "Close Ride" action for organizers — flags riders who checked in but didn't check out
- [x] Activity feed: add CHECK_IN and CHECK_OUT activity types
- [x] Missing checkout alert: notify organizers after event window ends

**Schema:**

```prisma
model EventCheckIn {
  id         String          @id @default(cuid())
  eventId    String
  riderId    String
  checkInAt  DateTime        @default(now())
  checkOutAt DateTime?
  method     CheckInMethod

  event RideEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rider Rider     @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([eventId, riderId])
}

enum CheckInMethod {
  QR
  NFC
  MANUAL
}
```

---

## Phase 3: Emergency Contact Card ✅

**Effort:** Medium — new fields on Rider, new profile section, encryption layer.

**What exists:** Rider model with profile fields, profile edit UI, S3/file infrastructure.

**Work:**

- [x] Add emergency fields to Rider or create separate `EmergencyCard` model
- [x] Envelope encryption: implement DEK/KEK pattern for medical data at rest (`src/lib/emergency-crypto.ts`, AES-256-GCM, `EMERGENCY_MASTER_KEY`)
- [x] Profile settings: "Emergency Card" section to add/edit emergency contacts, blood type, allergies, conditions, medications
- [x] Rider controls: enable/disable card, choose which fields are visible
- [x] Token generation: create unique emergency token per rider
- [x] Access logging: `EmergencyCardAccess` model (token, IP, userAgent, timestamp)

**Schema:**

```prisma
model EmergencyCard {
  id               String   @id @default(cuid())
  riderId          String   @unique
  token            String   @unique @default(cuid())
  active           Boolean  @default(true)

  // Encrypted fields (envelope encryption — stored as ciphertext)
  encryptedData    Bytes
  dekCiphertext    Bytes

  // Visibility toggles
  showBloodType    Boolean  @default(true)
  showAllergies    Boolean  @default(true)
  showConditions   Boolean  @default(true)
  showMedications  Boolean  @default(true)
  showInsurance    Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  rider    Rider                @relation(fields: [riderId], references: [id], onDelete: Cascade)
  accesses EmergencyCardAccess[]
}

model EmergencyCardAccess {
  id        String   @id @default(cuid())
  cardId    String
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  card EmergencyCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
}
```

---

## Phase 4: NFC Emergency ID Page ✅

**Effort:** Medium — new public page, acknowledgment gate, NFC URL routing.

**Depends on:** Phase 3 (emergency card data must exist).

**Work:**

- [x] Create `/emergency/[token]` public route
- [x] Acknowledgment gate UI: "I am accessing this for emergency purposes" confirmation before revealing data
- [x] Decrypt and display emergency card fields based on visibility toggles
- [x] Geolocation: request scanner's position via browser Geolocation API, reverse geocode to street address (Nominatim/OSM)
- [x] Display readable location + GPS coordinates on emergency card page (shown to organizers/on incident log)
- [x] One-tap "Call 911" button with location context
- [x] Log access on every view (IP, user-agent, timestamp, coordinates)
- [x] Deactivated state: show "This emergency card has been deactivated" if token is inactive
- [x] Token regeneration action in rider profile settings
- [x] Add emergency card setup prompt to Safety page

---

## Phase 5: Route Hazard Reporting

**Effort:** Medium — new model, map integration, real-time-ish feed.

**What exists:** Routes with GeoJSON geometry, waypoints, MapLibre integration, road detail pages.

**Work:**

- [ ] Add `HazardReport` model (riderId, routeId/roadId, type enum, lat/lng, description, status, expiresAt)
- [ ] Hazard types: DEBRIS, POLICE, ROADWORK, WEATHER, ANIMAL, ACCIDENT, OTHER
- [ ] Report UI: button on route/road pages and during active rides
- [ ] Map overlay: show active hazards as markers on route maps
- [ ] Auto-expire hazards after configurable TTL (e.g., 4 hours for debris, 24 hours for roadwork)
- [ ] Activity feed: HAZARD_REPORTED activity type

---

## Phase 6: Rider Down Quick Alert ✅

**Effort:** Medium — alert flow UI, organizer notification, depends on check-in data.

**Depends on:** Phase 1 (organizer roles), Phase 2 (know who's on the ride).

**Work:**

- [x] "Rider Down" emergency button on event page (visible to organizers during active ride)
- [x] Alert flow: select affected rider from checked-in list, add location/notes (with GPS capture)
- [x] Notify all organizers immediately (in-app activity + future push/SMS)
- [x] Incident record: `RideIncident` model with event, rider, location, notes, timestamp
- [x] Post-ride incident log visible to organizers for follow-up (resolve action + incident list)
- [x] Admin audit trail for incident records (delivered in Phase 13: `AdminIncident.rideIncidentId` links a Rider Down alert to a private case file, and all actions on it are recorded in `AuditLog`)

---

## Phase 7: Waitlist and RSVP Enhancements ✅

**Effort:** Medium — extends existing RSVP system.

**What exists:** RSVP model with GOING/INTERESTED/NOT_GOING, event page RSVP buttons.

**Work:**

- [x] Add `maxCapacity` field to RideEvent
- [x] Add WAITLISTED status to RsvpStatus enum
- [x] Auto-promote: when a GOING rider cancels, promote the earliest WAITLISTED rider
- [x] RSVP cutoff: add `rsvpDeadline` field, disable RSVP after deadline
- [x] No-show tracking: riders who RSVP'd GOING but never checked in get flagged (at Close Ride)
- [x] Notification: notify promoted riders (in-app); cutoff shown on RSVP button — reminder scheduling deferred

---

## Phase 8: Batch Messaging to RSVP Riders ✅

**Effort:** Small — no new models; the fan-out, audience filter, and inbox all already existed.

**Depends on:** Phase 1 (organizer permissions).

**Work:**

- [x] Organizer action: "Message Riders" on the event page (`MessageRidersDialog`)
- [x] Compose with audience filter — everyone who RSVP'd, GOING, WAITLISTED, INTERESTED, or CHECKED_IN — each showing its live size
- [x] Deliver as an in-app `EVENT_MESSAGE` activity with `refId` set to the event, landing in `/notifications`
- [x] Templates: update, delay, weather call, cancelled, route change — each preselects a sensible audience and fills an editable opening line
- [ ] Future: email delivery channel with opt-in preference (deferred — belongs with Phase 14's notification centre, which is where delivery tracking lives)

**Notes:**

- Reuses `logActivityForRiders`, the same fan-out Close Ride uses, rather than introducing a message store. Phase 14's notification centre is the right place to add delivery tracking, and doing it here would have pre-empted that design.
- "Everyone who RSVP'd" means GOING + WAITLISTED + INTERESTED — deliberately not riders who answered NOT_GOING.
- The sender is named in the message, and is excluded from their own fan-out.
- Any organizer can send, not just the HOST, and the control is not gated on the ride being active: delays and route changes are announced beforehand.

---

## Phase 9: Route Intelligence

**Effort:** Large — extends existing route/road infrastructure with analytics and suggestions.

**What exists:** Route model with GeoJSON, waypoints (START, KSU, FUEL, FOOD, REST, STOP, END), road ratings, MapLibre integration.

**Work:**

- [ ] Turn-by-turn page: render route with ordered stops, fuel stations, regroup points
- [ ] Route quality score: aggregate from road ratings + rider feedback post-ride
- [ ] Difficulty prediction: compute from distance, elevation (from an open elevation source, e.g. Open-Elevation / OpenTopoData), and historical pace data
- [ ] Best time to ride: seasonal/time-of-day suggestions based on historical event data and weather patterns
- [ ] Post-ride feedback form: rate route difficulty, scenery, road conditions

---

## Phase 10: Rider Reputation and Progression ✅

**Effort:** Large — new models, computation logic, profile UI.

**Depends on:** Phase 2 (attendance data from check-ins).

**Work:**

- [x] Trust signals: `RiderTrust` snapshot computed in `src/lib/reputation.ts` from attendance rate (40 pts), punctuality vs event start with a 15-minute grace (25 pts), safety-waiver acceptance (15 pts), and ride volume (20 pts) → a 0–100 score and a `TrustLevel`
- [x] `Badge` and `RiderBadge` models with data-driven criteria (`BadgeCriteria` + `threshold`) rather than per-badge hard-coding
- [x] Auto-award badges: first group ride, 500/2,000 miles, 10/50 events attended, ride leader, mentor, safety-first — seeded in `prisma/seed.ts`, awarded on check-in, manual check-in, and Close Ride
- [x] Skill tracks: `SkillTrack` + `RiderSkill` (formation riding, cornering, hand signals, group braking) — self-reported at `/skills`, with MENTOR reserved for organizer verification
- [x] Profile display: `ReputationPanel` on the rider Overview tab showing trust level, score breakdown, badges, and skills
- [x] Leaderboard/progression page at `/leaderboard`, sortable by trust, miles, rides, or badges

**Notes:**

- Trust is recomputed, never incremented, so it can't drift from the underlying check-in data. Badges are additive — once earned, a later dip in signals never revokes one.
- Attendance is measured against past events the rider RSVP'd GOING to, so never RSVPing doesn't read as a 0% attendance rate.
- Ties into Phase 13: accepting the current `SAFETY_WAIVER` policy is worth 15 points, and bumping that policy's version invalidates the signal. Because trust is a cached snapshot refreshed on ride events, use "Recompute trust for all riders" on `/admin/badges` after a waiver version bump or a scoring change.

---

## Phase 11: Community Growth ✅

**Effort:** Large — multiple independent features.

**Work:**

- [x] Referral invites: `ReferralCode` + `Referral`. Each rider gets a code at `/invite`; `/i/<CODE>` records the open, sets a 30-day cookie, and lands on `/join` with the inviter named. Attribution happens at signup, and `Referral.referredUserId` is unique so a rider is only ever credited once. Top referrers surface in `/admin/community`
- [x] Onboarding quests: `Quest` + `RiderQuest` — complete profile, add bike, accept guidelines, RSVP, emergency card, follow a rider, attend a ride. Shown as a checklist on the owner's own profile Overview and hidden once finished
- [x] Crew pages: `Crew` + `CrewMember` (sportbike, touring, beginner, women riders) at `/crews` and `/crews/[slug]`, with members, upcoming/past rides, and join/leave. Events carry an optional `crewId`
- [x] Local business partnerships: `Sponsor` + `EventSponsor` with logo, link, and tier — public at `/sponsors`, a strip on the homepage, and per-ride credit on the event page
- [x] Public event highlights: `RideEvent.featured` toggled from `/admin/community`, rendered as a Featured Rides section on the homepage; event pages gained excerpt-driven descriptions, OG/Twitter images, and `noindex` on cancelled rides (Event JSON-LD already existed)

**Notes:**

- Quest completion is latched: once a step is done it stays done, even if the underlying data changes later (a bike sold, a journal entry deleted). Onboarding is something you finished, not a state to maintain.
- Referral attribution never blocks a signup — an unknown, self-referring, or already-used code is ignored rather than failing registration.
- Sponsor links are rendered `rel="noopener noreferrer nofollow"` and only `http(s)` URLs are stored, since these are outbound third-party links.

---

## Phase 12: Media and Storytelling

**Effort:** Large — builds on existing gallery infrastructure.

**What exists:** GalleryItem model (polymorphic), event galleries, journal entries with photos/videos.

**Work:**

- [ ] Auto event recap: generate summary from event photos, route, attendance, and journal entries
- [ ] Contributor credits: track who uploaded each photo/video, display attribution
- [ ] Per-event gallery moderation queue: organizers approve/reject photos before they go public
- [ ] Ride of the month voting: nomination + community vote with monthly reset

---

## Phase 13: Admin and Moderation Enhancements ✅

**Effort:** Medium-large — extends existing admin infrastructure.

**What exists:** Admin dashboard, report queue, malware audit, user/role management.

**Work:**

- [x] Incident logging: `AdminIncident` + `AdminIncidentNote` models with private notes, linked to events/riders/`RideIncident` (`/admin/incidents`)
- [x] Content triage queue: `Report` is now polymorphic (journal, comment, event, photo, rider, news) with a `ReportPriority` SLA tier — urgent 4h, normal 24h, low 72h — surfaced at `/admin/triage` with overdue badges (`src/lib/triage.ts`)
- [x] Audit trail: `AuditLog` model recording all admin actions (who, what, when, before/after) via `src/lib/audit.ts`, viewable at `/admin/audit`; wired into triage, incidents, roles, news moderation, storage, and policies
- [x] Policy acknowledgment: `Policy` + `PolicyAcknowledgment` models, admin CRUD at `/admin/policies`, member flow at `/policies/[slug]`; acknowledgments are per-version, so a version bump re-prompts everyone. A starter **Community Guidelines** policy is seeded from the community's own four rules (`npm run db:seed:catalog`); the **safety waiver is not** — write it at `/admin/policies`

**Notes:**

- `/admin/reports` now redirects to `/admin/triage`, which supersedes the journal-only queue.
- Takedown semantics vary by type: journal/comment/photo are deleted, events are cancelled, news posts are unpublished, and rider reports have no automatic action — they escalate to an incident instead.

---

## Phase 14: Platform Reliability and Insights

**Effort:** Large — cross-cutting infrastructure.

**What exists:** Activity feed, admin dashboard with basic metrics.

**Work:**

- [ ] Organizer analytics dashboard: attendance trends, churn rate, RSVP-to-attendance conversion
- [ ] Notification center: unified notification model with delivery tracking (in-app, email, push)
- [ ] Calendar sync: generate .ics feeds for Google/Apple/Outlook calendar subscriptions
- [ ] PWA enhancements: offline event card, quick check-in action, install prompts

---

## Phase 15: Challenges

**Effort:** Medium — two models and a page; the scoring engine already exists.

**Why:** The one feature worth borrowing from REVER. They run time-boxed competitions ("500 miles in
March", "ride 8 of 10 Sunday rides"); we have badges, which are permanent and individual, but nothing
with a deadline and a field. Challenges give lapsed riders a reason to come back this month rather
than someday.

**Depends on:** Phase 2 (check-ins are the evidence), Phase 10 (reuses the reputation engine).

**What exists:** `EventCheckIn` (attendance + timestamps), `RideEvent.distanceMiles`,
`RiderTrust.milesRidden` / `eventsAttended`, the `BadgeCriteria` + `threshold` pattern and its
evaluator in `src/lib/reputation.ts`, `logActivityForRiders` for announcements, and the leaderboard
page to model the standings UI on.

**Work:**

- [ ] Add `Challenge` model (slug, name, description, metric, goal, startsAt, endsAt, crewId?, active)
- [ ] Add `ChallengeEntry` model (challengeId, riderId, progress, completedAt) — one row per rider per challenge
- [ ] Metrics: MILES_RIDDEN, EVENTS_ATTENDED, EVENTS_ORGANIZED, DISTINCT_ROADS — mirroring `BadgeCriteria`
      so the two engines stay recognisably the same shape
- [ ] Scoring: count only check-ins **within the challenge window**, so progress is earned during the
      challenge rather than backfilled from history the day someone joins
- [ ] Join/leave action; auto-enrol is deliberately avoided — a challenge nobody opted into is just a chart
- [ ] Recompute progress in `syncRiderProgression`, alongside trust and badges, so it lands on the same
      hooks (check-in, manual check-in, Close Ride)
- [ ] `/challenges` index (active, upcoming, past) and `/challenges/[slug]` with standings
- [ ] Optional crew-scoped challenges via `crewId` (Phase 11 already has crews and membership)
- [ ] Award a badge on completion — reuse `RiderBadge` rather than inventing a second trophy case
- [ ] Activity: `CHALLENGE_JOINED`, `CHALLENGE_COMPLETED`
- [ ] Admin CRUD under `/admin/community`, audited like the rest of Phase 13

**Schema sketch:**

```prisma
model Challenge {
  id          String          @id @default(cuid())
  slug        String          @unique
  name        String
  description String
  metric      ChallengeMetric
  goal        Int
  startsAt    DateTime
  endsAt      DateTime
  crewId      String?
  active      Boolean         @default(true)

  crew    Crew?            @relation(fields: [crewId], references: [id], onDelete: SetNull)
  entries ChallengeEntry[]

  @@index([active, startsAt, endsAt])
}

model ChallengeEntry {
  id          String    @id @default(cuid())
  challengeId String
  riderId     String
  progress    Int       @default(0)
  completedAt DateTime?
  joinedAt    DateTime  @default(now())

  challenge Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  rider     Rider     @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([challengeId, riderId])
  @@index([riderId])
}

enum ChallengeMetric {
  MILES_RIDDEN
  EVENTS_ATTENDED
  EVENTS_ORGANIZED
  DISTINCT_ROADS
}
```

**Notes:**

- Progress is recomputed from check-ins, never incremented, for the same reason trust is: an incremented
  counter drifts from the data and can't be audited.
- `completedAt` latches. Finishing a challenge is a fact about a moment, and shouldn't be revoked if the
  rules or the data change later.
