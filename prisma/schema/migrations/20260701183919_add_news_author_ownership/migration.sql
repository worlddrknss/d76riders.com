-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "authorUserId" TEXT;

-- CreateIndex
CREATE INDEX "NewsPost_authorUserId_idx" ON "NewsPost"("authorUserId");

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
