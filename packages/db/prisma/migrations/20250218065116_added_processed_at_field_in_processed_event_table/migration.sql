/*
  Warnings:

  - You are about to drop the column `workerId` on the `ProcessedEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `ProcessedEvent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `processedAt` to the `ProcessedEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProcessedEvent" DROP COLUMN "workerId",
ADD COLUMN     "processedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_eventId_key" ON "ProcessedEvent"("eventId");
