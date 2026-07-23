-- Opt-out for automatic ride-change emails (cancelled / moved / waitlist spot).
-- Defaults on: a rider who registered for a ride should hear when it is called
-- off, and opting out has to be a choice they made rather than the default.
ALTER TABLE "Rider" ADD COLUMN "emailOnRideChange" BOOLEAN NOT NULL DEFAULT true;
