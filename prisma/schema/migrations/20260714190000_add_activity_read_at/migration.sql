-- AlterTable: add optional readAt timestamp to activity for read/unread state
ALTER TABLE "Activity" ADD COLUMN "readAt" TIMESTAMP(3);
