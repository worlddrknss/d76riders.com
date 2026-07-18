-- Grandfather accounts that predate email verification.
--
-- The hard verification gate is new. Any account created before it exists was
-- never asked to confirm, so treat those as already-verified rather than lock
-- them out at the gate on the next deploy. New signups (emailVerified NULL from
-- here on) still go through the confirmation flow.
UPDATE "User" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "emailVerified" IS NULL;
