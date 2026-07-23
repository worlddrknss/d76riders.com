-- Move the nine seeded articles back to DRAFT so they can get proper cover
-- images before going public. A follow-up migration rather than an edit to the
-- seed: that one is already applied, and Prisma checksums migration files.
--
-- Scoped to the seeded ids, so a real post — including the Bell Witch ride
-- report — is never touched.
UPDATE "NewsPost"
SET "status" = 'DRAFT', "updatedAt" = now()
WHERE "id" IN (
  'd76-post-tn-laws',
  'd76-post-cherohala',
  'd76-post-fall-color',
  'd76-post-first-group-ride',
  'd76-post-hand-signals',
  'd76-post-cold-weather',
  'd76-post-summer-heat',
  'd76-post-rider-down',
  'd76-post-day-ride-packing'
);
