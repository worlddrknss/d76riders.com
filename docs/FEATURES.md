# Feature Backlog

A prioritized list of high-impact features for District 76 Riders.

## Priority 1: Ride Safety Stack

- Live check-in and check-out for rides
  - Context-aware check-in button on event page (same QR code, no second QR)
  - Visible when event is today, rider has RSVP, and hasn't checked in yet
  - Check-out button appears after check-in; organizers can also close the ride
  - EventCheckIn model: riderId, eventId, checkInAt, checkOutAt, method (QR/NFC)
  - Missing checkout alert: notify organizers if a rider doesn't check out after event ends
- Emergency contact card per rider
- NFC helmet tag for emergency ID and ride check-in
  - NTAG215 rewritable stickers (504 bytes, transparent)
  - URL written to tag: `d76riders.com/emergency/{token}`
  - Acknowledgment gate before revealing medical info
  - Tiered disclosure: name, emergency contacts, blood type, allergies, conditions
  - Envelope encryption (DEK per rider, KEK in external key store) for medical data at rest
  - Rider controls: enable/disable card, choose visible fields, regenerate token (rewrite sticker)
  - Access logging: IP, timestamp, user-agent per tap
  - Revoke token online; rewrite sticker with new token via NFC Tools app or at meetup
- Route hazard reporting (debris, police, roadwork, weather)
- Rider down quick alert flow for organizers

## Priority 2: Event Operations

- Multiple event organizers with roles
  - EventOrganizer model: eventId, riderId, role (HOST, LEAD, SWEEP, MARSHAL)
  - Event creator is automatically HOST
  - HOST can add/remove other organizers
  - All organizer roles see live attendance panel and can manage check-ins
- Waitlist with auto-promote when spots open
- Role-based ride staffing (lead, sweep, medic, photographer)
- RSVP cutoff rules and no-show tracking
- Batch messaging to RSVP riders (updates, delays, cancellations)

## Priority 3: Route Intelligence

- Turn-by-turn friendly route pages with stops, fuel, and regroup points
- Route quality score from rider feedback
- Difficulty prediction from distance, elevation, and pace history
- Best time to ride suggestions by season and time of day

## Priority 4: Rider Reputation and Progression

- Trust signals: attendance, punctuality, safety acknowledgements
- Milestones and badges (first group ride, 500 miles, mentor)
- Skill tracks for newer riders (formation, cornering, hand signals)

## Priority 5: Community Growth

- Referral invites and onboarding quests for new members
- Crew pages for sub-groups (sportbike, touring, beginner, women riders)
- Local business partnerships and sponsor integrations
- Public event highlights to improve discoverability and SEO

## Priority 6: Media and Storytelling

- Auto event recap builder from photos, route, and attendance
- Contributor credits for photographers and videographers
- Per-event gallery moderation queue
- Ride of the month community voting

## Priority 7: Admin and Moderation

- Incident logging with private admin notes
- Content and report triage queue with SLA labels
- Audit trail for event edits and moderation actions
- Policy acknowledgement tracking for members

## Priority 8: Platform Reliability and Insights

- Organizer analytics dashboard (attendance, churn, conversion)
- Notification center with delivery tracking
- Calendar sync (Google, Apple, Outlook)
- PWA enhancements (offline event card, quick actions)
