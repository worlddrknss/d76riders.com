-- CreateEnum
CREATE TYPE "HazardType" AS ENUM ('DEBRIS', 'POLICE', 'ROADWORK', 'WEATHER', 'ANIMAL', 'ACCIDENT', 'OTHER');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'HAZARD_REPORTED';

-- CreateTable
CREATE TABLE "HazardReport" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "roadId" TEXT,
    "routeId" TEXT,
    "type" "HazardType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "clearedAt" TIMESTAMP(3),
    "clearedByRiderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HazardReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HazardReport_roadId_clearedAt_expiresAt_idx" ON "HazardReport"("roadId", "clearedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "HazardReport_routeId_clearedAt_expiresAt_idx" ON "HazardReport"("routeId", "clearedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

