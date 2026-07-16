
-- CreateEnum
CREATE TYPE "ChallengeMetric" AS ENUM ('MILES_RIDDEN', 'EVENTS_ATTENDED', 'EVENTS_ORGANIZED');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" "ChallengeMetric" NOT NULL,
    "goal" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "crewId" TEXT,
    "badgeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeEntry" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_active_startsAt_endsAt_idx" ON "Challenge"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Challenge_crewId_idx" ON "Challenge"("crewId");

-- CreateIndex
CREATE INDEX "ChallengeEntry_riderId_idx" ON "ChallengeEntry"("riderId");

-- CreateIndex
CREATE INDEX "ChallengeEntry_challengeId_progress_idx" ON "ChallengeEntry"("challengeId", "progress" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_challengeId_riderId_key" ON "ChallengeEntry"("challengeId", "riderId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

