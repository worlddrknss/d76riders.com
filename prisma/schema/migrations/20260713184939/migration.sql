/*
  Warnings:

  - Changed the type of `scan_result` on the `malware_scan_audits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `action_taken` on the `malware_scan_audits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- The table this migration alters is created by 20260713190000_add_malware_scan_audits,
-- which sorts AFTER this one — so on a fresh database the ALTER below used to fail
-- with "relation malware_scan_audits does not exist" and the whole chain stopped here.
-- Existing environments already have the table (it was created out-of-band), so this
-- guard is a no-op there and only repairs a from-scratch replay.
CREATE TABLE IF NOT EXISTS "malware_scan_audits" (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  object_key TEXT,
  object_url TEXT,
  content_type TEXT,
  file_size_bytes BIGINT,
  scan_result TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  details TEXT
);

-- CreateEnum
CREATE TYPE "MalwareScanResult" AS ENUM ('CLEAN', 'INFECTED', 'ERROR', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MalwareActionTaken" AS ENUM ('ALLOWED', 'BLOCKED', 'DELETED', 'DELETE_FAILED');

-- AlterTable
ALTER TABLE "malware_scan_audits" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "scan_result",
ADD COLUMN     "scan_result" "MalwareScanResult" NOT NULL,
DROP COLUMN "action_taken",
ADD COLUMN     "action_taken" "MalwareActionTaken" NOT NULL;

-- CreateIndex
CREATE INDEX "malware_scan_audits_scan_result_idx" ON "malware_scan_audits"("scan_result");
