/*
  Warnings:

  - Changed the type of `scan_result` on the `malware_scan_audits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `action_taken` on the `malware_scan_audits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
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
