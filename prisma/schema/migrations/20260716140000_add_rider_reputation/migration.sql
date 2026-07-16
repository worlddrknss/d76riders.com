
-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('NEW', 'ESTABLISHED', 'TRUSTED', 'VETERAN');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "BadgeCriteria" AS ENUM ('EVENTS_ATTENDED', 'MILES_RIDDEN', 'EVENTS_ORGANIZED', 'MENTOR', 'SAFETY_ACKNOWLEDGED', 'MANUAL');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('LEARNING', 'PRACTICING', 'PROFICIENT', 'MENTOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'BADGE_EARNED';
ALTER TYPE "ActivityType" ADD VALUE 'SKILL_VERIFIED';
ALTER TYPE "ActivityType" ADD VALUE 'TRUST_LEVEL_UP';

-- CreateTable
CREATE TABLE "RiderTrust" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "level" "TrustLevel" NOT NULL DEFAULT 'NEW',
    "eventsAttended" INTEGER NOT NULL DEFAULT 0,
    "eventsCommitted" INTEGER NOT NULL DEFAULT 0,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "onTimeCheckIns" INTEGER NOT NULL DEFAULT 0,
    "milesRidden" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "punctualityRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyAcked" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderTrust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'award',
    "tier" "BadgeTier" NOT NULL DEFAULT 'BRONZE',
    "criteria" "BadgeCriteria" NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderBadge" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedByUserId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'target',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderSkill" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'LEARNING',
    "verifiedByRiderId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderTrust_riderId_key" ON "RiderTrust"("riderId");

-- CreateIndex
CREATE INDEX "RiderTrust_score_idx" ON "RiderTrust"("score" DESC);

-- CreateIndex
CREATE INDEX "RiderTrust_level_idx" ON "RiderTrust"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_criteria_idx" ON "Badge"("criteria");

-- CreateIndex
CREATE INDEX "RiderBadge_riderId_idx" ON "RiderBadge"("riderId");

-- CreateIndex
CREATE INDEX "RiderBadge_badgeId_idx" ON "RiderBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderBadge_riderId_badgeId_key" ON "RiderBadge"("riderId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTrack_slug_key" ON "SkillTrack"("slug");

-- CreateIndex
CREATE INDEX "RiderSkill_riderId_idx" ON "RiderSkill"("riderId");

-- CreateIndex
CREATE INDEX "RiderSkill_skillId_idx" ON "RiderSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderSkill_riderId_skillId_key" ON "RiderSkill"("riderId", "skillId");

-- AddForeignKey
ALTER TABLE "RiderTrust" ADD CONSTRAINT "RiderTrust_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderBadge" ADD CONSTRAINT "RiderBadge_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderBadge" ADD CONSTRAINT "RiderBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderBadge" ADD CONSTRAINT "RiderBadge_awardedByUserId_fkey" FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderSkill" ADD CONSTRAINT "RiderSkill_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderSkill" ADD CONSTRAINT "RiderSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderSkill" ADD CONSTRAINT "RiderSkill_verifiedByRiderId_fkey" FOREIGN KEY ("verifiedByRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

