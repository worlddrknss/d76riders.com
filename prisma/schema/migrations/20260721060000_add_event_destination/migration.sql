-- Final destination for a ride (the meetup is the start; this is the endpoint).
ALTER TABLE "RideEvent" ADD COLUMN "endLocation" TEXT;
ALTER TABLE "RideEvent" ADD COLUMN "endAddress" TEXT;
ALTER TABLE "RideEvent" ADD COLUMN "endLat" DOUBLE PRECISION;
ALTER TABLE "RideEvent" ADD COLUMN "endLng" DOUBLE PRECISION;
