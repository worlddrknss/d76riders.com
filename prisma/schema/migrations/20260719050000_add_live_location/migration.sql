-- CreateTable
CREATE TABLE "LiveLocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveLocation_eventId_updatedAt_idx" ON "LiveLocation"("eventId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveLocation_eventId_riderId_key" ON "LiveLocation"("eventId", "riderId");

-- AddForeignKey
ALTER TABLE "LiveLocation" ADD CONSTRAINT "LiveLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveLocation" ADD CONSTRAINT "LiveLocation_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
