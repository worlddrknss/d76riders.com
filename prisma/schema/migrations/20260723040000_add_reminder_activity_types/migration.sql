-- The 24h ride reminder and the maintenance-due nudge were push-only, so they
-- reached nobody without a push subscription and left no trace in the bell.
-- Giving them activity types puts them in the notifications inbox too.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'RIDE_REMINDER';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MAINTENANCE_DUE';
