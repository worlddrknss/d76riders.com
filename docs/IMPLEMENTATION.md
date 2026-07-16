# Implementation Phases

Organized from quickest to implement, based on existing infrastructure and dependencies.

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
- [ ] Admin audit trail for incident records (deferred — belongs with Phase 13 AuditLog)

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

## Phase 8: Batch Messaging to RSVP Riders

**Effort:** Medium — new messaging UI, delivery tracking.

**Depends on:** Phase 1 (organizer permissions).

**Work:**

- [ ] Organizer action: "Message Riders" on event page
- [ ] Compose message with audience filter (all RSVP, GOING only, WAITLISTED only)
- [ ] Deliver as in-app activity with event reference
- [ ] Message templates: update, delay, cancellation, custom
- [ ] Future: email delivery channel with opt-in preference

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

## Phase 10: Rider Reputation and Progression

**Effort:** Large — new models, computation logic, profile UI.

**Depends on:** Phase 2 (attendance data from check-ins).

**Work:**

- [ ] Trust signals: compute from attendance rate, punctuality (check-in time vs event start), safety acknowledgments
- [ ] `Badge` and `RiderBadge` models with criteria definitions
- [ ] Auto-award badges: first group ride, 500 miles, 10 events attended, mentor status
- [ ] Skill tracks: formation riding, cornering, hand signals — self-reported or organizer-verified
- [ ] Profile display: badges and trust level on rider profile
- [ ] Leaderboard/progression page

---

## Phase 11: Community Growth

**Effort:** Large — multiple independent features.

**Work:**

- [ ] Referral invites: unique invite links per rider, track conversions
- [ ] Onboarding quests: guided steps for new members (complete profile, RSVP first event, add bike)
- [ ] Crew pages: sub-group model (sportbike, touring, beginner, women riders) with members and events
- [ ] Local business partnerships: sponsor model with logo, link, and event association
- [ ] Public event highlights: featured events on homepage and SEO-optimized event pages

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

## Phase 13: Admin and Moderation Enhancements

**Effort:** Medium-large — extends existing admin infrastructure.

**What exists:** Admin dashboard, report queue, malware audit, user/role management.

**Work:**

- [ ] Incident logging: `AdminIncident` model with private notes, linked to events/riders
- [ ] Content triage queue: unified queue for reports across all content types with SLA labels (urgent, normal, low)
- [ ] Audit trail: `AuditLog` model recording all admin actions (who, what, when, before/after)
- [ ] Policy acknowledgment: track member acceptance of community guidelines, safety waivers

---

## Phase 14: Platform Reliability and Insights

**Effort:** Large — cross-cutting infrastructure.

**What exists:** Activity feed, admin dashboard with basic metrics.

**Work:**

- [ ] Organizer analytics dashboard: attendance trends, churn rate, RSVP-to-attendance conversion
- [ ] Notification center: unified notification model with delivery tracking (in-app, email, push)
- [ ] Calendar sync: generate .ics feeds for Google/Apple/Outlook calendar subscriptions
- [ ] PWA enhancements: offline event card, quick check-in action, install prompts
