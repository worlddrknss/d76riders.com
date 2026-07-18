-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'MENTIONED';

-- CreateTable
CREATE TABLE "JournalHashtag" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "JournalHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalMention" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "mentionedRiderId" TEXT NOT NULL,

    CONSTRAINT "JournalMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalHashtag_tag_idx" ON "JournalHashtag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "JournalHashtag_entryId_tag_key" ON "JournalHashtag"("entryId", "tag");

-- CreateIndex
CREATE INDEX "JournalMention_mentionedRiderId_idx" ON "JournalMention"("mentionedRiderId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalMention_entryId_mentionedRiderId_key" ON "JournalMention"("entryId", "mentionedRiderId");

-- AddForeignKey
ALTER TABLE "JournalHashtag" ADD CONSTRAINT "JournalHashtag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalMention" ADD CONSTRAINT "JournalMention_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalMention" ADD CONSTRAINT "JournalMention_mentionedRiderId_fkey" FOREIGN KEY ("mentionedRiderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

