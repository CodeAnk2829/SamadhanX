-- DropForeignKey
ALTER TABLE "ComplaintHistory" DROP CONSTRAINT "ComplaintHistory_handledBy_fkey";

-- DropIndex
DROP INDEX "ComplaintHistory_complaintId_handledBy_key";

-- AlterTable
ALTER TABLE "ComplaintHistory" ALTER COLUMN "handledBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ComplaintHistory" ADD CONSTRAINT "ComplaintHistory_handledBy_fkey" FOREIGN KEY ("handledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
