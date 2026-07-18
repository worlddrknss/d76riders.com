
-- CreateTable
CREATE TABLE "SponsorReview" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorReview_sponsorId_idx" ON "SponsorReview"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorReview_riderId_idx" ON "SponsorReview"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorReview_sponsorId_riderId_key" ON "SponsorReview"("sponsorId", "riderId");

-- AddForeignKey
ALTER TABLE "SponsorReview" ADD CONSTRAINT "SponsorReview_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorReview" ADD CONSTRAINT "SponsorReview_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

