-- AlterEnum: add BOOTS to GearCategory
ALTER TYPE "GearCategory" ADD VALUE 'BOOTS';

-- AlterTable: add purchaseUrl column
ALTER TABLE "GearItem" ADD COLUMN "purchaseUrl" TEXT;
