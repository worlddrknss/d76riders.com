/*
  Warnings:

  - A unique constraint covering the columns `[routeId]` on the table `Road` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `riderId` to the `Road` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "riderId" TEXT NOT NULL,
ADD COLUMN     "routeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Road_routeId_key" ON "Road"("routeId");

-- CreateIndex
CREATE INDEX "Road_riderId_idx" ON "Road"("riderId");

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
