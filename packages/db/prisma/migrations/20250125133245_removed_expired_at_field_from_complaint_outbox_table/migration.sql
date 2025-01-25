/*
  Warnings:

  - You are about to drop the column `expiredAt` on the `ComplaintOutbox` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ComplaintOutbox" DROP COLUMN "expiredAt";
