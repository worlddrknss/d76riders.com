# District 76 Website Plan

## Product Direction
District 76 is a modern motorcycle community brand for riders in and around Clarksville, Tennessee.

The experience should feel premium, minimal, and welcoming to all rider types.

### Brand and UX Principles
- Community-first, not club-first
- Clean typography and large visual breathing room
- Real local context: Clarksville and Middle Tennessee roads
- Mobile-first with polished desktop refinement
- Accessibility and performance as defaults
- Minimal, intentional use of accent color

## Stack and Foundation
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide React
- Zod
- Prisma

## Delivery Strategy
Build in phases so we can publish quickly, learn early, and scale without rewriting core structure.

## Phase 0: Scaffold + Theme + Static Pages
Target: get a clean, deployable static website up quickly with minimal effort.

### Scope (Minimum Effort)
- Project scaffold and folder foundations
- Global layout with sticky responsive navigation
- Core visual theme setup:
  - typography scale
  - spacing system
  - color tokens
  - base card/button/input styles
- Static page scaffolds with realistic copy:
  - Home
  - About
  - Events
  - Members
  - Gallery
  - Join
- Home sections (static content only):
  - Hero
  - About District 76
  - Upcoming Rides
  - Featured Tennessee Roads
  - Community Statistics
  - Recent Community Activity
  - Photo Gallery
  - CTA
  - Footer
- Light reusable component pass (only what is needed to avoid duplication):
  - Navbar
  - Section Header
  - Card primitives used by rides/events/members/roads
  - Footer
- Mock data stored in simple local data files
- Basic accessibility baseline:
  - semantic landmarks
  - heading order
  - visible focus states
- Responsive behavior verified for mobile and desktop

### Phase 0 Technical Decisions
- Keep all data local and static for speed
- Keep business logic minimal and colocated near pages/components
- No authentication or backend write paths yet
- No map integrations yet, only route placeholders
- No lightbox, only masonry-ready gallery grid
- No complex animations yet
- No heavy component abstraction yet

### Done Criteria
- All initial pages exist with complete static content
- Theme and brand direction are consistent across pages
- Mobile and desktop navigation are both usable
- Site deploys cleanly without backend dependencies

## Phase 0.5: Polish + Reusability Pass
Target: improve consistency and UX polish after static launch.

### Scope
- Add shadcn/ui primitives for consistency (buttons, cards, sheets, dialogs)
- Add Framer Motion for subtle entrance and interaction motion
- Improve image handling with optimized responsive image placeholders
- Add empty-state and no-data component variants
- Add SEO metadata and social share tags for each page
- Add analytics event hooks for CTA clicks and page engagement
- Expand shared components into dedicated feature cards:
  - Ride Card
  - Event Card
  - Member Card
  - Statistics Card
  - Gallery Grid
  - CTA Banner

### Done Criteria
- Design system usage is consistent across pages
- Motion feels subtle and intentional
- Metadata and social preview are present for all core pages

## Phase 1: Architecture Hardening
Target: set up data and domain boundaries for long-term scalability.

### Scope
- Introduce app-level architecture conventions:
  - domain types in types
  - schema validation in lib or schemas via Zod
  - mock repositories or service layer in lib
- Introduce Prisma schema and initial models (no complex features yet):
  - Member
  - RideEvent
  - Road
  - Activity
  - GalleryItem
- Add server-side data access boundaries so pages do not directly couple to Prisma
- Add reusable loading, error, and empty UI states

### Done Criteria
- Pages can switch from mock data to database data with minimal page-level refactor
- Validation and typing are centralized, not duplicated

## Phase 2: Data-Backed Community Core
Target: transition from static showcase to interactive community platform basics.

### Scope
- Events:
  - data-backed event listings
  - event details page
  - RSVP state model (initial)
- Members:
  - data-backed member directory
  - profile-ready card and detail routing structure
- Gallery:
  - persisted gallery items
  - lightbox-ready data and UI hooks
- Activity feed:
  - generated from domain events (joins, uploads, ride completions)

### Done Criteria
- Core pages consume real structured data
- URL structure supports long-term expansion

## Phase 3: Platform Modules (Planned, Not Yet Implemented)
Target: prepare expansion modules behind stable architecture boundaries.

### Modules to prepare
- Authentication
- Rider profiles
- Motorcycle garage
- Ride tracking
- GPS route sharing and maps
- Messaging
- Local chapters
- Marketplace
- Challenges and badges
- Event management tools
- AI ride planner
- Notifications
- Mobile app support

### Architecture Preparation
- Keep feature modules isolated by domain
- Use service interfaces and adapter pattern for external integrations
- Preserve shared UI primitives and consistent component contracts

## Recommended Folder Structure (Scalable)

app/
components/
  layout/
  home/
  events/
  members/
  gallery/
  ui/
hooks/
lib/
types/
data/
public/
  images/
styles/

## Content Guidelines
- Use realistic, local, rider-focused copy across all pages
- Reinforce District 76 as Clarksville’s rider community brand
- Avoid references to outlaw or exclusionary club identity
- Keep tone welcoming, practical, and adventure-forward

## Visual System Guardrails
- Background: Off White
- Surface: White
- Primary: Deep Asphalt (#1F2937)
- Accent: Burnt Orange (#C76B29), used sparingly
- Secondary: Forest Green (#355E3B)
- Borders: Light Gray
- Text: Near Black
- Muted: Gray

## Suggested Execution Order
1. Build shared layout, navigation, and footer
2. Build Home sections and component primitives with mock data
3. Add About, Events, Members, Gallery, Join pages using shared components
4. Normalize data and type contracts across all cards/sections
5. Add motion, iconography, and responsive polish
6. Integrate shadcn/ui and tighten accessibility and SEO
7. Introduce Prisma + Zod layer behind service interfaces

## Risks and Mitigations
- Risk: scope creep before launch
  - Mitigation: strict Phase 0 done criteria and defer advanced modules
- Risk: early coupling of page UI to data source
  - Mitigation: enforce typed service boundaries from Phase 1
- Risk: visual inconsistency as components grow
  - Mitigation: standardize on shared UI primitives and token usage

## Definition of Success
- Users immediately understand District 76 as Clarksville’s welcoming rider community
- Core pages feel complete and trustworthy on first visit
- Architecture supports adding advanced community features without large rewrites
