
-- CreateEnum
CREATE TYPE "SponsorStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "status" "SponsorStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN     "submittedByRiderId" TEXT;

-- CreateIndex
CREATE INDEX "Sponsor_status_idx" ON "Sponsor"("status");

-- CreateIndex
CREATE INDEX "Sponsor_submittedByRiderId_idx" ON "Sponsor"("submittedByRiderId");

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_submittedByRiderId_fkey" FOREIGN KEY ("submittedByRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Every sponsor that already exists got there through the admin console, before
-- submissions existed — so it was already vetted. Without this they'd inherit the
-- PENDING_REVIEW default and vanish from /sponsors until someone re-approved them.
UPDATE "Sponsor" SET "status" = 'APPROVED', "reviewedAt" = NOW();
