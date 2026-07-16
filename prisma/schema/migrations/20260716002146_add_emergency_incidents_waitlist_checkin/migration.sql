-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'CHECK_IN';
ALTER TYPE "ActivityType" ADD VALUE 'CHECK_OUT';
ALTER TYPE "ActivityType" ADD VALUE 'MISSING_CHECKOUT';
ALTER TYPE "ActivityType" ADD VALUE 'RIDER_DOWN';
ALTER TYPE "ActivityType" ADD VALUE 'RSVP_WAITLISTED';
ALTER TYPE "ActivityType" ADD VALUE 'WAITLIST_PROMOTED';
ALTER TYPE "ActivityType" ADD VALUE 'NO_SHOW';

-- AlterEnum
ALTER TYPE "RsvpStatus" ADD VALUE 'WAITLISTED';

-- AlterTable
ALTER TABLE "RideEvent" ADD COLUMN     "maxCapacity" INTEGER,
ADD COLUMN     "rsvpDeadline" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmergencyCard" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "encryptedData" BYTEA NOT NULL,
    "dekCiphertext" BYTEA NOT NULL,
    "showBloodType" BOOLEAN NOT NULL DEFAULT true,
    "showAllergies" BOOLEAN NOT NULL DEFAULT true,
    "showConditions" BOOLEAN NOT NULL DEFAULT true,
    "showMedications" BOOLEAN NOT NULL DEFAULT true,
    "showInsurance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyCardAccess" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyCardAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideIncident" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "notes" TEXT,
    "locationText" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyCard_riderId_key" ON "EmergencyCard"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyCard_token_key" ON "EmergencyCard"("token");

-- CreateIndex
CREATE INDEX "EmergencyCardAccess_cardId_idx" ON "EmergencyCardAccess"("cardId");

-- CreateIndex
CREATE INDEX "RideIncident_eventId_idx" ON "RideIncident"("eventId");

-- CreateIndex
CREATE INDEX "RideIncident_riderId_idx" ON "RideIncident"("riderId");

-- AddForeignKey
ALTER TABLE "EmergencyCard" ADD CONSTRAINT "EmergencyCard_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCardAccess" ADD CONSTRAINT "EmergencyCardAccess_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "EmergencyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideIncident" ADD CONSTRAINT "RideIncident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideIncident" ADD CONSTRAINT "RideIncident_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideIncident" ADD CONSTRAINT "RideIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

