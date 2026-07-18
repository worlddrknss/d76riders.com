-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Rider_calendarToken_key" ON "Rider"("calendarToken");

