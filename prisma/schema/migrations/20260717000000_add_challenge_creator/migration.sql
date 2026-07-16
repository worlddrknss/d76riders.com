
-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "createdByRiderId" TEXT;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdByRiderId_fkey" FOREIGN KEY ("createdByRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

