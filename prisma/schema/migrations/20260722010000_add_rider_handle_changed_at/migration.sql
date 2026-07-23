-- Handle changes are rate-limited (28 days). Null means the handle has never
-- been changed since signup, so every existing rider gets one free change.
ALTER TABLE "Rider" ADD COLUMN "handleChangedAt" TIMESTAMP(3);
