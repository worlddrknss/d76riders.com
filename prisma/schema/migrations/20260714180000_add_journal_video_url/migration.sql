-- AlterTable: add optional video embed URL to journal entries
ALTER TABLE "JournalEntry" ADD COLUMN "videoUrl" TEXT;
