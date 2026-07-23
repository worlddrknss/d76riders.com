-- Per-channel notification routing.
--
-- Rows are opt-OUTs: a missing row means the route is on. That way adding a
-- category or a channel later turns it on for everyone rather than leaving it
-- silently off, and the table stays near-empty for riders who never change it.
CREATE TABLE "NotificationPreference" (
    "riderId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("riderId","category","channel")
);

CREATE INDEX "NotificationPreference_riderId_idx" ON "NotificationPreference"("riderId");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_riderId_fkey"
    FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over every existing email opt-out, so nobody who had switched a
-- category off starts receiving it again because the storage changed.
INSERT INTO "NotificationPreference" ("riderId", "category", "channel")
SELECT "id", 'mention', 'email' FROM "Rider" WHERE "emailOnMention" = false
UNION ALL SELECT "id", 'comment', 'email' FROM "Rider" WHERE "emailOnComment" = false
UNION ALL SELECT "id", 'rsvp', 'email' FROM "Rider" WHERE "emailOnRsvp" = false
UNION ALL SELECT "id", 'event', 'email' FROM "Rider" WHERE "emailOnEventMessage" = false
UNION ALL SELECT "id", 'rideChange', 'email' FROM "Rider" WHERE "emailOnRideChange" = false
UNION ALL SELECT "id", 'reminder', 'email' FROM "Rider" WHERE "emailOnReminders" = false
UNION ALL SELECT "id", 'weeklyRecap', 'email' FROM "Rider" WHERE "emailWeeklyRecap" = false;

ALTER TABLE "Rider"
  DROP COLUMN "emailOnMention",
  DROP COLUMN "emailOnComment",
  DROP COLUMN "emailOnRsvp",
  DROP COLUMN "emailOnEventMessage",
  DROP COLUMN "emailOnRideChange",
  DROP COLUMN "emailOnReminders",
  DROP COLUMN "emailWeeklyRecap";
