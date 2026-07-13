-- CreateEnum
CREATE TYPE "GearCategory" AS ENUM ('HELMET', 'GLOVES', 'JACKET', 'PANTS', 'CAMERA_GEAR', 'ACCESSORY');

-- CreateTable
CREATE TABLE "GearItem" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "category" "GearCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "size" TEXT,
    "color" TEXT,
    "condition" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GearItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GearItem_riderId_category_idx" ON "GearItem"("riderId", "category");

-- CreateIndex
CREATE INDEX "GearItem_purchaseDate_idx" ON "GearItem"("purchaseDate");

-- AddForeignKey
ALTER TABLE "GearItem" ADD CONSTRAINT "GearItem_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
