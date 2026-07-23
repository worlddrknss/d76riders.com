-- Account suspension.
--
-- The console could grant and revoke roles but had no way to stop an account
-- entirely, so the only lever against an abusive member was deleting them —
-- which also destroys their events, articles and journal. Suspension is the
-- missing middle: the content stays, the door locks.
--
-- NULL suspendedAt means in good standing, so every existing row is unaffected.
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedById" TEXT;

-- SET NULL rather than CASCADE: deleting the moderator who applied a suspension
-- must never quietly delete the suspended accounts along with them.
ALTER TABLE "User"
  ADD CONSTRAINT "User_suspendedById_fkey"
  FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Listing suspended accounts is a routine moderation query.
CREATE INDEX "User_suspendedAt_idx" ON "User"("suspendedAt");
