-- Opt-out for scheduled nudges: the 24h ride reminder, post-ride recap, and
-- maintenance coming due. Separate from emailOnRideChange, which is news about
-- a ride changing rather than a reminder about one that hasn't.
ALTER TABLE "Rider" ADD COLUMN "emailOnReminders" BOOLEAN NOT NULL DEFAULT true;
