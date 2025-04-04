/*
  Warnings:

  - A unique constraint covering the columns `[complaintId,handledBy]` on the table `ComplaintHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ComplaintHistory_complaintId_handledBy_key" ON "ComplaintHistory"("complaintId", "handledBy");
