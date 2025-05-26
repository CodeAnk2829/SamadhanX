/*
  Warnings:

  - You are about to drop the column `complaintId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `createdAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventType` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payload` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_complaintId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "complaintId",
DROP COLUMN "message",
DROP COLUMN "sentAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "eventType" "Status" NOT NULL,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payload" JSONB NOT NULL;
