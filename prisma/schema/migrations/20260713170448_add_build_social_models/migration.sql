-- CreateEnum
CREATE TYPE "ModificationCategory" AS ENUM ('EXTERIOR', 'SUSPENSION', 'PERFORMANCE', 'WHEELS', 'INTERIOR', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MAINTENANCE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'ADDED_MODIFICATION';
ALTER TYPE "ActivityType" ADD VALUE 'LOGGED_SERVICE';
ALTER TYPE "ActivityType" ADD VALUE 'FOLLOWED_RIDER';
ALTER TYPE "ActivityType" ADD VALUE 'FAVORITED_BUILD';

-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN     "buildModificationId" TEXT,
ADD COLUMN     "serviceRecordId" TEXT;

-- CreateTable
CREATE TABLE "BuildModification" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ModificationCategory" NOT NULL DEFAULT 'OTHER',
    "cost" DOUBLE PRECISION,
    "mileage" INTEGER,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildModification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'MAINTENANCE',
    "cost" DOUBLE PRECISION,
    "mileage" INTEGER,
    "servicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildCollection" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildCollectionItem" (
    "collectionId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "addedByRiderId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildCollectionItem_pkey" PRIMARY KEY ("collectionId","bikeId")
);

-- CreateTable
CREATE TABLE "BuildFavorite" (
    "riderId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildFavorite_pkey" PRIMARY KEY ("riderId","bikeId")
);

-- CreateTable
CREATE TABLE "RiderFollow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderFollow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "EventFollow" (
    "riderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFollow_pkey" PRIMARY KEY ("riderId","eventId")
);

-- CreateIndex
CREATE INDEX "BuildModification_riderId_idx" ON "BuildModification"("riderId");

-- CreateIndex
CREATE INDEX "BuildModification_bikeId_idx" ON "BuildModification"("bikeId");

-- CreateIndex
CREATE INDEX "BuildModification_installedAt_idx" ON "BuildModification"("installedAt");

-- CreateIndex
CREATE INDEX "ServiceRecord_riderId_idx" ON "ServiceRecord"("riderId");

-- CreateIndex
CREATE INDEX "ServiceRecord_bikeId_idx" ON "ServiceRecord"("bikeId");

-- CreateIndex
CREATE INDEX "ServiceRecord_servicedAt_idx" ON "ServiceRecord"("servicedAt");

-- CreateIndex
CREATE INDEX "BuildCollection_riderId_idx" ON "BuildCollection"("riderId");

-- CreateIndex
CREATE INDEX "BuildCollectionItem_bikeId_idx" ON "BuildCollectionItem"("bikeId");

-- CreateIndex
CREATE INDEX "BuildCollectionItem_addedByRiderId_idx" ON "BuildCollectionItem"("addedByRiderId");

-- CreateIndex
CREATE INDEX "BuildFavorite_bikeId_idx" ON "BuildFavorite"("bikeId");

-- CreateIndex
CREATE INDEX "RiderFollow_followingId_idx" ON "RiderFollow"("followingId");

-- CreateIndex
CREATE INDEX "EventFollow_eventId_idx" ON "EventFollow"("eventId");

-- CreateIndex
CREATE INDEX "GalleryItem_buildModificationId_idx" ON "GalleryItem"("buildModificationId");

-- CreateIndex
CREATE INDEX "GalleryItem_serviceRecordId_idx" ON "GalleryItem"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_buildModificationId_fkey" FOREIGN KEY ("buildModificationId") REFERENCES "BuildModification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildModification" ADD CONSTRAINT "BuildModification_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildModification" ADD CONSTRAINT "BuildModification_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildCollection" ADD CONSTRAINT "BuildCollection_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildCollectionItem" ADD CONSTRAINT "BuildCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "BuildCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildCollectionItem" ADD CONSTRAINT "BuildCollectionItem_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildCollectionItem" ADD CONSTRAINT "BuildCollectionItem_addedByRiderId_fkey" FOREIGN KEY ("addedByRiderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFavorite" ADD CONSTRAINT "BuildFavorite_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFavorite" ADD CONSTRAINT "BuildFavorite_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderFollow" ADD CONSTRAINT "RiderFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderFollow" ADD CONSTRAINT "RiderFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollow" ADD CONSTRAINT "EventFollow_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollow" ADD CONSTRAINT "EventFollow_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
