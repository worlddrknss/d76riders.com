-- Turns the sponsor wall into a business directory.
--
-- Sponsor already had name/logo/website but no address, category or coordinates,
-- so it could not answer the only question a rider asks a directory: who can do
-- this, and where are they. Rather than a second table that lets one business be
-- entered twice and drift, a sponsor becomes a shop that also backs us.
--
-- tier loses its NOT NULL and its default: null means listed but not sponsoring,
-- which is what most businesses will be. Existing rows keep whatever tier they
-- have, so nothing drops off /sponsors.

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('MECHANIC', 'TIRES', 'GEAR', 'DEALER', 'PARTS', 'DETAILING', 'FABRICATION', 'TRAINING', 'OTHER');

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "address" TEXT,
ADD COLUMN     "category" "ShopCategory",
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "tier" DROP NOT NULL,
ALTER COLUMN "tier" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Sponsor_category_idx" ON "Sponsor"("category");
