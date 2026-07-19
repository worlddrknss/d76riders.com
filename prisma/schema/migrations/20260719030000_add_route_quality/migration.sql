-- AlterTable
ALTER TABLE "RoadRating" ADD COLUMN     "condition" INTEGER,
ADD COLUMN     "twistiness" INTEGER;

-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "conditionRating" DOUBLE PRECISION,
ADD COLUMN     "twistinessRating" DOUBLE PRECISION,
ADD COLUMN     "qualityScore" DOUBLE PRECISION;
