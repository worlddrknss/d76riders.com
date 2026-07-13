-- Rename WHEELS to WHEELS_TIRES
ALTER TYPE "ModificationCategory" RENAME VALUE 'WHEELS' TO 'WHEELS_TIRES';

-- Remove INTERIOR (rename to ERGONOMICS since it's the closest moto equivalent)
-- Note: Can't remove enum values in Postgres, so we rename INTERIOR to ERGONOMICS
ALTER TYPE "ModificationCategory" RENAME VALUE 'INTERIOR' TO 'ERGONOMICS';

-- Add new motorcycle-specific categories
ALTER TYPE "ModificationCategory" ADD VALUE 'EXHAUST';
ALTER TYPE "ModificationCategory" ADD VALUE 'LIGHTING';
ALTER TYPE "ModificationCategory" ADD VALUE 'PROTECTION';
ALTER TYPE "ModificationCategory" ADD VALUE 'ENGINE';
