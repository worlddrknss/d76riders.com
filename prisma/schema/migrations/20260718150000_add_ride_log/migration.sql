
-- CreateTable
CREATE TABLE "RideLog" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "title" TEXT,
    "distanceMiles" INTEGER NOT NULL,
    "riddenAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideLog_riderId_idx" ON "RideLog"("riderId");

-- CreateIndex
CREATE INDEX "RideLog_riddenAt_idx" ON "RideLog"("riddenAt");

-- AddForeignKey
ALTER TABLE "RideLog" ADD CONSTRAINT "RideLog_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
