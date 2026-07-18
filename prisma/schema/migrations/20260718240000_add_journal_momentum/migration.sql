-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "momentum" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "JournalEntry_momentum_idx" ON "JournalEntry"("momentum");
