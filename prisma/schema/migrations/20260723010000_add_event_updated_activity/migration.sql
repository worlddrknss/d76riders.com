-- Riders tracking a ride (and those RSVP'd to it) are told when the organizer
-- moves the time or the meetup point. Adding the value only — Postgres 12+
-- allows ALTER TYPE ... ADD VALUE inside a transaction so long as the new value
-- isn't also used there, and nothing writes it until the app rolls out.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'EVENT_UPDATED';
