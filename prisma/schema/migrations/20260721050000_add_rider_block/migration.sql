-- Rider-to-rider block: a block in either direction ends DMs between the pair.
CREATE TABLE "RiderBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

CREATE INDEX "RiderBlock_blockedId_idx" ON "RiderBlock"("blockedId");

ALTER TABLE "RiderBlock" ADD CONSTRAINT "RiderBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiderBlock" ADD CONSTRAINT "RiderBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
