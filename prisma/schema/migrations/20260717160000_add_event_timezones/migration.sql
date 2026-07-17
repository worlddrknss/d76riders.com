-- AlterTable
ALTER TABLE "RideEvent" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "timezone" TEXT;

-- Backfill: existing event times were stored as naive Central wall-clock (a ride
-- typed as 7 PM was saved as 19:00 with no zone). Reinterpret that wall-clock as
-- America/Chicago and store the true UTC instant instead. `AT TIME ZONE` is
-- DST-aware per date, so summer (CDT, -5) and winter (CST, -6) events both
-- convert correctly. Runs once; every existing event already defaulted to the
-- America/Chicago timezone column above, which matches this assumption.
UPDATE "RideEvent" SET
  "startsAt" = ("startsAt" AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC',
  "ksuAt" = CASE WHEN "ksuAt" IS NOT NULL
    THEN ("ksuAt" AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' ELSE NULL END,
  "rsvpDeadline" = CASE WHEN "rsvpDeadline" IS NOT NULL
    THEN ("rsvpDeadline" AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' ELSE NULL END;

