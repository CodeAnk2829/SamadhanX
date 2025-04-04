/*
  Warnings:

  - A unique constraint covering the columns `[complaintId]` on the table `Feedback` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'RECREATED';

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_complaintId_key" ON "Feedback"("complaintId");
