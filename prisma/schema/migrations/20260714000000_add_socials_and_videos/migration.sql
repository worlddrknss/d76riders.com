-- AlterTable: add social links to Rider
ALTER TABLE "Rider" ADD COLUMN "youtubeUrl" TEXT;
ALTER TABLE "Rider" ADD COLUMN "tiktokUrl" TEXT;
ALTER TABLE "Rider" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "Rider" ADD COLUMN "twitterUrl" TEXT;

-- CreateEnum
CREATE TYPE "VideoPlatform" AS ENUM ('YOUTUBE', 'TIKTOK', 'OTHER');

-- CreateTable
CREATE TABLE "RiderVideo" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiderVideo_riderId_platform_idx" ON "RiderVideo"("riderId", "platform");

-- AddForeignKey
ALTER TABLE "RiderVideo" ADD CONSTRAINT "RiderVideo_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
