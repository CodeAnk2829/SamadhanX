/*
  Warnings:

  - Added the required column `eventType` to the `ComplaintOutbox` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ComplaintEvent" AS ENUM ('CREATED', 'DELEGATED', 'DELETED', 'ESCALATED', 'RESOLVED');

-- AlterTable
ALTER TABLE "ComplaintOutbox" ADD COLUMN     "eventType" "ComplaintEvent" NOT NULL,
ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false;
