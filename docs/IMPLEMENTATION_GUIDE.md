# Implementation Guide

This guide turns the current TODO list into concrete implementation plans.

## 1. Replace placeholder hero and gallery images with real community media
- Audit all `siteImages.*` fallbacks and decide which should remain theme art versus real content.
- Replace generic placeholders with a curated media source for hero banners, gallery cards, and CTA backgrounds.
- Keep a deterministic fallback path so pages still render when media is missing.
- Acceptance: no placeholder art remains on public-facing primary surfaces unless intentionally used as branding.

## 2. Compute road distance from route geometry instead of stored/manual values
- Add a geometry distance helper that computes miles/kilometers from route waypoints.
- Recalculate distance when route geometry changes and persist the derived value where needed.
- Add a migration or backfill to update existing roads.
- Acceptance: roads display calculated distance from route data, not a hand-edited field.

## 3. Create GMAIL account for SMTP Transporter
- Provision a dedicated Gmail account for transactional mail.
- Store SMTP credentials in the secret manager and wire them through the app config.
- Validate transport with a test email flow from the app.
- Acceptance: password reset and notification emails send successfully from the app.

## 4. Decide whether the static Gallery page should become upload-backed
- Review the current `/gallery` page and the media model/storage path.
- Decide between:
  - keeping it as a curated static showcase, or
  - converting it to a database-backed upload gallery.
- If converting, define upload ownership, moderation, storage, and cleanup rules.
- Acceptance: the page direction is decided and documented before any large UI work.

## 5. Build the member profile dashboard UI shown in the mockups
- Expand the current rider/member profile into a dashboard surface with summary cards and quick actions.
- Add sections for featured build, garage inventory, achievements, and recent activity.
- Reuse existing rider/journal data first, then fill gaps with new queries or aggregate helpers.
- Acceptance: `/members/[handle]` or the chosen canonical surface matches the new dashboard layout.

## 6. Add build timeline and activity feed pages
- Introduce a build detail timeline page that lists modifications chronologically.
- Add an activity feed for recent changes, comments, service entries, and uploads.
- Use shared event data so the feed stays consistent across build, garage, and profile views.
- Acceptance: each build can show a readable history of changes and recent activity.

## 7. Add build analytics and spending breakdown charts
- Define the metrics to surface: total invested, parts spend, labor, maintenance, and trend lines.
- Aggregate from build modification and service records.
- Choose lightweight chart components that fit the current design language.
- Acceptance: a build analytics page renders meaningful spend and trend summaries.

## 8. Add saved collections and favorites for builds and parts
- Add persistence for user-saved builds, parts, and collections.
- Decide whether collections are private, shareable, or both.
- Add save/unsave actions and a library page for browsing saved items.
- Acceptance: users can save builds and parts and revisit them later.

## 9. Add following, people, and event lists on profile pages
- Add follow relationships for riders and optionally events/builds.
- Surface people, events, and followed items in profile sections with clear tabs or cards.
- Ensure privacy and visibility rules are defined before exposing follow data.
- Acceptance: a member profile can show who they follow and what they are tracking.

## 10. Add service record and maintenance history views
- Model service records with date, mileage, service type, cost, and notes.
- Add screens for viewing and editing maintenance history per vehicle/build.
- Reuse the existing garage flow so service entries are attached to the right asset.
- Acceptance: service history is visible, editable, and associated with a specific build.

## 11. Add photo gallery and upload management for builds
- Move from static imagery toward build-specific photo management.
- Add upload, reorder, caption, cover selection, and delete flows.
- Use the existing S3/MinIO upload path and the new image optimization helper.
- Acceptance: a build can store and manage multiple photos with a chosen cover image.

## 12. Add map search and nearby builder discovery
- Add search, filtering, and proximity-based discovery for people/builds/events on a map.
- Reuse existing route/map utilities and calculate bounds/geography from stored locations.
- Keep the UX mobile-friendly because this is likely a primary discovery surface.
- Acceptance: users can find nearby people/builds/events on an interactive map.

## 13. Add notifications and recent activity alerts
- Define notification types for comments, follows, uploads, event changes, and moderation events.
- Add a notifications table or queue plus unread state per user.
- Surface recent activity in a centralized feed and lightweight alerts in the UI.
- Acceptance: users can see recent activity and unread notifications in one place.
