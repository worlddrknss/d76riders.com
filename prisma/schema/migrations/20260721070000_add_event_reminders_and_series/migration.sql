-- Ride reminders: stamp when the ~24h reminder push has fired (once).
ALTER TABLE "RideEvent" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
-- Recurring series: occurrences created together share a seriesId.
ALTER TABLE "RideEvent" ADD COLUMN "seriesId" TEXT;

CREATE INDEX "RideEvent_seriesId_idx" ON "RideEvent"("seriesId");
CREATE INDEX "RideEvent_status_reminderSentAt_startsAt_idx" ON "RideEvent"("status", "reminderSentAt", "startsAt");
