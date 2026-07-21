-- Sub-communities near-me: coordinates so the listing can sort nearest-first.
ALTER TABLE "Crew" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Crew" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Marketplace buyer↔seller DMs: a conversation started from a listing bypasses
-- the mutual-follow gate.
ALTER TABLE "Conversation" ADD COLUMN "openContact" BOOLEAN NOT NULL DEFAULT false;

-- Seed coordinates for the default city sub-communities (approx. city centers).
UPDATE "Crew" SET "latitude" = 36.5298, "longitude" = -87.3595 WHERE "slug" = 'clarksville';
UPDATE "Crew" SET "latitude" = 36.1627, "longitude" = -86.7816 WHERE "slug" = 'nashville';
UPDATE "Crew" SET "latitude" = 35.9606, "longitude" = -83.9207 WHERE "slug" = 'knoxville';
UPDATE "Crew" SET "latitude" = 35.0456, "longitude" = -85.3097 WHERE "slug" = 'chattanooga';
UPDATE "Crew" SET "latitude" = 35.1495, "longitude" = -90.0490 WHERE "slug" = 'memphis';
