-- A cancelled ride is not a changed ride: it reads differently, is styled
-- differently, and is the one notification a rider must not miss. Separate
-- migration from EVENT_UPDATED because that one has already been applied.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'EVENT_CANCELLED';
