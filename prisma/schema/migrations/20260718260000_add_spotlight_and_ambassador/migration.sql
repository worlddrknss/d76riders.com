-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "isAmbassador" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Spotlight" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "blurb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spotlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Spotlight_weekStart_key" ON "Spotlight"("weekStart");

-- CreateIndex
CREATE INDEX "Spotlight_riderId_idx" ON "Spotlight"("riderId");

-- AddForeignKey
ALTER TABLE "Spotlight" ADD CONSTRAINT "Spotlight_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
