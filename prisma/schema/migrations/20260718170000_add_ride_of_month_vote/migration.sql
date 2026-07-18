
-- CreateTable
CREATE TABLE "RideOfMonthVote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideOfMonthVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideOfMonthVote_period_idx" ON "RideOfMonthVote"("period");

-- CreateIndex
CREATE INDEX "RideOfMonthVote_eventId_idx" ON "RideOfMonthVote"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RideOfMonthVote_riderId_period_key" ON "RideOfMonthVote"("riderId", "period");

-- AddForeignKey
ALTER TABLE "RideOfMonthVote" ADD CONSTRAINT "RideOfMonthVote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideOfMonthVote" ADD CONSTRAINT "RideOfMonthVote_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
