/*
  Warnings:

  - Made the column `handledBy` on table `ComplaintHistory` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ComplaintHistory" DROP CONSTRAINT "ComplaintHistory_handledBy_fkey";

-- AlterTable
ALTER TABLE "ComplaintHistory" ALTER COLUMN "handledBy" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ComplaintHistory" ADD CONSTRAINT "ComplaintHistory_handledBy_fkey" FOREIGN KEY ("handledBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
