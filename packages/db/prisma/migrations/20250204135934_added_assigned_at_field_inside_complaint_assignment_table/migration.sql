-- AlterTable
ALTER TABLE "ComplaintAssignment" ADD COLUMN     "assignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ComplaintDelegation" ALTER COLUMN "delegatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ComplaintResolution" ALTER COLUMN "resolvedAt" DROP NOT NULL;
