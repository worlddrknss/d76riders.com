-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "AdminIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MONITORING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('COMMUNITY_GUIDELINES', 'SAFETY_WAIVER', 'TERMS', 'PRIVACY');

-- CreateEnum
CREATE TYPE "ReportSubjectType" AS ENUM ('JOURNAL_ENTRY', 'COMMENT', 'EVENT', 'GALLERY_ITEM', 'RIDER', 'NEWS_POST');

-- CreateEnum
CREATE TYPE "ReportPriority" AS ENUM ('URGENT', 'NORMAL', 'LOW');

-- AlterTable
-- Report becomes polymorphic. Existing rows are all journal-entry reports, so the
-- DEFAULT on subjectType backfills them correctly and journalEntryId stays set.
ALTER TABLE "Report" ADD COLUMN     "subjectType" "ReportSubjectType" NOT NULL DEFAULT 'JOURNAL_ENTRY',
ADD COLUMN     "priority" "ReportPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "galleryItemId" TEXT,
ADD COLUMN     "subjectRiderId" TEXT,
ADD COLUMN     "newsPostId" TEXT;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "journalEntryId" DROP NOT NULL;

-- Existing harassment reports are the ones worth surfacing first once the queue
-- starts sorting by SLA; everything else keeps the NORMAL default.
UPDATE "Report" SET "priority" = 'URGENT' WHERE "reason" = 'HARASSMENT' AND "status" = 'PENDING';

-- CreateTable
CREATE TABLE "AdminIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'NORMAL',
    "status" "AdminIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "eventId" TEXT,
    "riderId" TEXT,
    "rideIncidentId" TEXT,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminIncidentNote" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminIncidentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminIncident_status_idx" ON "AdminIncident"("status");

-- CreateIndex
CREATE INDEX "AdminIncident_severity_idx" ON "AdminIncident"("severity");

-- CreateIndex
CREATE INDEX "AdminIncident_eventId_idx" ON "AdminIncident"("eventId");

-- CreateIndex
CREATE INDEX "AdminIncident_riderId_idx" ON "AdminIncident"("riderId");

-- CreateIndex
CREATE INDEX "AdminIncident_createdAt_idx" ON "AdminIncident"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminIncidentNote_incidentId_idx" ON "AdminIncidentNote"("incidentId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_slug_key" ON "Policy"("slug");

-- CreateIndex
CREATE INDEX "Policy_active_idx" ON "Policy"("active");

-- CreateIndex
CREATE INDEX "Policy_type_idx" ON "Policy"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgment_policyId_riderId_version_key" ON "PolicyAcknowledgment"("policyId", "riderId", "version");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_riderId_idx" ON "PolicyAcknowledgment"("riderId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_policyId_idx" ON "PolicyAcknowledgment"("policyId");

-- CreateIndex
CREATE INDEX "Report_commentId_idx" ON "Report"("commentId");

-- CreateIndex
CREATE INDEX "Report_eventId_idx" ON "Report"("eventId");

-- CreateIndex
CREATE INDEX "Report_galleryItemId_idx" ON "Report"("galleryItemId");

-- CreateIndex
CREATE INDEX "Report_subjectRiderId_idx" ON "Report"("subjectRiderId");

-- CreateIndex
CREATE INDEX "Report_newsPostId_idx" ON "Report"("newsPostId");

-- CreateIndex
CREATE INDEX "Report_subjectType_idx" ON "Report"("subjectType");

-- CreateIndex
CREATE INDEX "Report_status_priority_createdAt_idx" ON "Report"("status", "priority", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminIncident" ADD CONSTRAINT "AdminIncident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncident" ADD CONSTRAINT "AdminIncident_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncident" ADD CONSTRAINT "AdminIncident_rideIncidentId_fkey" FOREIGN KEY ("rideIncidentId") REFERENCES "RideIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncident" ADD CONSTRAINT "AdminIncident_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncident" ADD CONSTRAINT "AdminIncident_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncidentNote" ADD CONSTRAINT "AdminIncidentNote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "AdminIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIncidentNote" ADD CONSTRAINT "AdminIncidentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RideEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_galleryItemId_fkey" FOREIGN KEY ("galleryItemId") REFERENCES "GalleryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_subjectRiderId_fkey" FOREIGN KEY ("subjectRiderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_newsPostId_fkey" FOREIGN KEY ("newsPostId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
