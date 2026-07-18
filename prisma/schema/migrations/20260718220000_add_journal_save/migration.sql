-- CreateTable
CREATE TABLE "Save" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Save_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Save_riderId_idx" ON "Save"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "Save_riderId_journalEntryId_key" ON "Save"("riderId", "journalEntryId");

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
