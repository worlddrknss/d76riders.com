# District 76 Masterplan

This document meshes the current shipped build with the product vision in
`docs/MYTHOUGHTS.md` and the phased delivery plan in `docs/PLAN.md`. It is the
single source of truth for where District 76 is today and where it is going.

---

## 1. Product North Star

District 76 is a **community-driven** motorcycle platform for riders in and
around Clarksville, Tennessee. It is welcoming, premium, and local-first, and it
is built so that every rider is a first-class participant, not just a visitor.

The defining principle from `MYTHOUGHTS.md`:

> Everything is community driven. Each rider gets a profile, a ride journal, and
> their own garage. Riders create their own events, map their own routes, set
> KSU details, and run their own event galleries.

This reframes the project from a **brand showcase** (Phase 0 today) into a
**rider platform** (the destination).

### Experience Principles
- Community-first, not club-first. No outlaw or exclusionary identity.
- Clean typography, generous spacing, sparing use of the burnt-orange accent.
- Real local context: Clarksville, Fort Campbell, Middle Tennessee roads.
- Mobile-first, polished on desktop.
- Accessibility and performance as defaults.

---

## 2. Where We Are Today (Shipped)

A cinematic, photography-driven static site on the App Router. All content is
mock data in `src/data/community.ts`; there is no backend, auth, or database yet.

### Pages live now
- **Home** (`/`) — hero, About, Explore feature tiles (Riders / Garage / Events /
  News), Upcoming Rides, Featured Roads, Community Stats, Activity + Gallery,
  The Happenings (news teaser), CTA.
- **History** (`/about`) — three-chapter Clarksville and military narrative.
- **Events** (`/events`) — horizontal event list with date badges, register CTA,
  route planning notes, past rides.
- **Garage** (`/garage`) — **currently a global garage** of member machines with
  spec cards. *(Flagged for change, see Section 4.)*
- **Members** (`/members`) — rider directory with profile links.
- **Member profile** (`/members/[id]`) — sticky profile card, photo grid, and a
  ride journal feed with likes and comments.
- **News** (`/news`, `/news/[id]`) — article list with sidebar and full article
  pages, statically generated.
- **Gallery** (`/gallery`) and **Join** (`/join`).

### Foundation in place
- Next.js (App Router, Turbopack), TypeScript, Tailwind CSS v4.
- Centralized design tokens in `globals.css` (warm charcoal + burnt orange).
- Centralized swappable imagery in `src/data/images.ts` (Unsplash placeholders).
- Shared layout: `Navbar`, `Footer`, `PageHero`.
- Typed domain in `src/types/community.ts`.
- Dynamic routes use the Next.js 16 `params: Promise<...>` + `generateStaticParams`
  pattern.

### Deliberately not built yet
- Authentication, user accounts, ownership.
- Any database or persistence (all data is static mock).
- Mapbox / route mapping.
- Rider-created events, journals, and galleries.
- Per-rider garages.

---

## 3. Target Stack (Reconciled)

`MYTHOUGHTS.md` and `PLAN.md` differ slightly; this is the agreed target.

| Concern        | Decision                                  | Status        |
| -------------- | ----------------------------------------- | ------------- |
| Framework      | Next.js (App Router)                      | In use        |
| Language       | TypeScript                                | In use        |
| Styling        | Tailwind CSS (mobile-first)               | In use        |
| UI primitives  | shadcn/ui                                 | Not yet       |
| Motion         | Framer Motion                             | Not yet       |
| Icons          | Lucide React                              | In use        |
| Auth           | **Auth.js** (NextAuth)                    | Not yet       |
| ORM            | Prisma                                    | Not yet       |
| Database       | Postgres (Prisma)                         | Not yet       |
| Validation     | Zod                                       | Not yet       |
| Maps           | **Mapbox** (routes, KSU points)           | Not yet       |
| Media          | Object storage + responsive images        | Not yet       |
| Image pipeline | **Sharp** (build/runtime image optimization) | Not yet     |

Auth.js is the source of truth for identity; Mapbox is the source of truth for
route mapping. Both were in `MYTHOUGHTS.md` and supersede any silence in `PLAN.md`.

**Sharp** powers image optimization. `next/image` uses it automatically during
production builds, and it is also the engine for any custom processing (resizing,
WebP/AVIF conversion, thumbnails) when riders upload garage, journal, and event
photos in Phase 2.

---

## 4. The Critical Reframe: Ownership

The single most important gap between the current build and the vision is
**ownership**. Today everything is global and read-only. The platform requires
that content belongs to riders.

| Concept   | Today (shipped)            | Target (vision)                                  |
| --------- | -------------------------- | ------------------------------------------------ |
| Garage    | One global list of bikes   | **Per-rider garage** owned by each profile       |
| Journal   | Mock entries on a profile  | Rider-authored posts with likes and comments     |
| Events    | Static admin-style list    | **Rider-created** events with routes and galleries |
| Routes    | Text notes, map placeholder| **Mapbox** routes with KSU points                |
| Gallery   | Global grid                | Global + **per-event** and per-rider galleries   |
| Profile   | Static mock data           | Authenticated, editable rider profile            |

**Action:** the current `/garage` page should evolve from a global garage into a
per-rider garage surfaced on the profile (`/members/[id]`), with the standalone
page either removed or repurposed as a "community garage" browse view that
aggregates per-rider bikes. This is tracked in Phase 2.

---

## 5. Domain Model (Target)

Initial Prisma models, derived from the vision. Kept intentionally small to start.

- **User** — auth identity (Auth.js). Has one Rider profile.
- **Rider** — public profile: name, location, bio, avatar, years riding,
  favorite road. Owns bikes, journal entries, events, galleries.
- **Bike** — belongs to a Rider. Make, model, year, type, engine specs, photos.
- **RideEvent** — created by a Rider. Title, date, KSU time and location, route,
  difficulty, RSVP list, gallery.
- **Route** — Mapbox geometry and waypoints, attached to a RideEvent or saved by
  a Rider. KSU (kickstands-up) point and fuel stops.
- **JournalEntry** — authored by a Rider. Text, photos, likes, comments.
- **Comment** — on a JournalEntry or RideEvent.
- **Like** — on a JournalEntry.
- **Road** — curated Featured Roads (community-level, editor-maintained).
- **GalleryItem** — belongs to a Rider or a RideEvent.
- **Activity** — derived feed events (joined, posted, completed a ride).
- **Rsvp** — Rider to RideEvent with status.

Access goes through a typed service layer in `lib/`, never directly from pages to
Prisma, so the mock-to-database swap is low-friction.

---

## 6. Information Architecture (Target Routes)

```
/                         Home
/about                    History
/events                   Browse events (community + mine)
/events/new               Create event (auth)
/events/[id]              Event detail: route map, KSU, RSVP, gallery
/members                  Rider directory
/members/[id]             Rider profile: journal, garage, events, gallery
/members/[id]/garage      Rider garage (per-rider, replaces global)
/garage                   Community garage (aggregated browse) — repurposed
/news, /news/[id]         News
/gallery                  Global gallery
/join                     Join / sign up
/dashboard                Authenticated rider home (manage my content)
/settings                 Profile and account settings
```

---

## 7. Delivery Phases (Meshed)

Phase numbering aligns with `PLAN.md` and folds in the `MYTHOUGHTS.md` ownership
vision.

### Phase 0 — Static Showcase  ✅ Complete
Clean, deployable, photographic static site with realistic local copy across all
core pages, shared layout, tokens, and mock data.

### Phase 0.5 — Polish + Reusability  (Next)
- [ ] Introduce shadcn/ui primitives (button, card, input, sheet, dialog) and
      migrate existing ad-hoc markup onto them.
- [ ] Add Framer Motion entrance and hover motion (subtle, intentional).
- [ ] Replace background-image divs with optimized responsive images
      (`next/image`, backed by **Sharp** for WebP/AVIF) and real local assets in
      `public/images`.
- [ ] Per-page SEO metadata and social share tags.
- [ ] Empty-state and no-data variants for lists.
- [ ] Extract dedicated feature cards: RideCard, EventCard, MemberCard,
      StatCard, GalleryGrid, CTABanner, NewsCard, BikeCard, JournalPost.

### Phase 1 — Architecture Hardening
- [ ] Centralize domain types (extend `src/types`).
- [ ] Add Zod schemas in `lib/schemas`.
- [ ] Add Prisma schema for the Section 5 models.
- [ ] Introduce a service layer (`lib/services`) with mock repositories first, so
      pages depend on interfaces, not the data source.
- [ ] Add shared loading, error, and empty UI states.

### Phase 2 — Data-Backed Community Core + Ownership
This is where the build becomes the vision.
- [ ] **Auth.js** sign-in and rider account creation.
- [ ] Editable **rider profiles** backed by the database.
- [ ] **Per-rider garage**: move bikes onto profiles; repurpose `/garage` as a
      community aggregate browse.
- [ ] **Rider-authored journal** with real likes and comments (replace mock).
- [ ] **Rider-created events**: create form, event detail page, RSVP model.
- [ ] **Mapbox routes**: draw and save routes, set KSU and fuel stops on events.
- [ ] **Per-event galleries** and lightbox.
- [ ] Activity feed generated from real domain events.

### Phase 3 — Platform Modules (planned, isolated by domain)
Auth hardening, ride tracking, GPS route sharing, messaging, local chapters,
marketplace, challenges and badges, event management tools, AI ride planner,
notifications, and mobile app support. Each behind stable service interfaces and
adapters so they can be added without core rewrites.

---

## 8. Immediate Next Steps (Recommended Order)

1. **Decide garage ownership now** so we stop deepening the global pattern:
   plan the move of bikes onto `/members/[id]` and repurpose `/garage`.
2. Stand up **shadcn/ui** and migrate buttons, cards, and inputs (Phase 0.5).
3. Add **Prisma schema + Zod + service layer with mock repos** (Phase 1) so the
   UI keeps working on mock data while the boundary is enforced.
4. Add **Auth.js** and make a single page (profile) read from the database
   through the service layer as the first real vertical slice (Phase 2).
5. Layer in **Mapbox** on the event detail page as the second vertical slice.

---

## 9. Visual System Guardrails

Tokens live in `src/app/globals.css`; changing them recolors the whole site.

- Background: Off White / warm canvas
- Surface: White
- Primary: Deep Asphalt (`#1F2937` family; current build uses warm charcoal)
- Accent: Burnt Orange (`#C76B29` / current `#E8703A`), used sparingly
- Secondary: Forest Green (`#355E3B`)
- Borders: Light Gray
- Text: Near Black · Muted: Gray
- Typography: Geist (display), Manrope (body)

---

## 10. Content Guidelines

- Realistic, local, rider-focused copy everywhere.
- Reinforce District 76 as Clarksville's welcoming rider community.
- Acknowledge the military town context (Fort Campbell, 101st Airborne) naturally.
- Avoid outlaw or exclusionary club identity.
- Natural tone: no em dashes, practical and adventure-forward.

---

## 11. Risks and Mitigations

- **Scope creep before a real launch.** Hold Phase 0.5 and Phase 1 done criteria;
  defer Phase 3 modules.
- **UI coupling to the data source.** Enforce the typed service boundary from
  Phase 1; pages never import Prisma directly.
- **Deepening the global-garage pattern.** Resolve ownership in the next step
  before building more on top of it.
- **Visual drift as components grow.** Standardize on shadcn/ui primitives and
  the shared token set.
- **Map and media cost/complexity.** Introduce Mapbox and object storage as
  isolated adapters, one vertical slice at a time.

---

## 12. Definition of Success

- A visitor instantly understands District 76 as Clarksville's welcoming rider
  community. *(Met today.)*
- A rider can sign in, own a profile, keep a journal, build a garage, create an
  event with a mapped route, and invite others. *(The destination.)*
- Advanced community features can be added without large rewrites, because every
  module sits behind a stable service interface.
