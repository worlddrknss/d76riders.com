-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "remindAt" TIMESTAMP(3),
ADD COLUMN     "remindedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ServiceRecord_remindAt_idx" ON "ServiceRecord"("remindAt");
