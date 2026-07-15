-- CreateEnum
CREATE TYPE "EventOrganizerRole" AS ENUM ('HOST', 'LEAD', 'SWEEP', 'MARSHAL');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'NFC', 'MANUAL');

-- CreateTable
CREATE TABLE "EventOrganizer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "role" "EventOrganizerRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "method" "CheckInMethod" NOT NULL,

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventOrganizer_riderId_idx" ON "EventOrganizer"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganizer_eventId_riderId_key" ON "EventOrganizer"("eventId", "riderId");

-- CreateIndex
CREATE INDEX "EventCheckIn_riderId_idx" ON "EventCheckIn"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckIn_eventId_riderId_key" ON "EventCheckIn"("eventId", "riderId");

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create HOST organizer for every existing event
INSERT INTO "EventOrganizer" ("id", "eventId", "riderId", "role")
SELECT gen_random_uuid(), "id", "hostId", 'HOST'
FROM "RideEvent"
ON CONFLICT DO NOTHING;
