-- AlterTable: add optional Facebook event URL to ride events
ALTER TABLE "RideEvent" ADD COLUMN "facebookEventUrl" TEXT;