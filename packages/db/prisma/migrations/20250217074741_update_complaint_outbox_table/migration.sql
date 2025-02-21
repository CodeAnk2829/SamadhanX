/*
  Warnings:

  - You are about to drop the column `complaintId` on the `ComplaintOutbox` table. All the data in the column will be lost.
  - You are about to drop the column `processed` on the `ComplaintOutbox` table. All the data in the column will be lost.
  - Added the required column `payload` to the `ComplaintOutbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processAfter` to the `ComplaintOutbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `ComplaintOutbox` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `eventType` on the `ComplaintOutbox` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('CANCELLED', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- DropForeignKey
ALTER TABLE "ComplaintOutbox" DROP CONSTRAINT "ComplaintOutbox_complaintId_fkey";

-- DropIndex
DROP INDEX "ComplaintOutbox_complaintId_key";

-- AlterTable
ALTER TABLE "ComplaintOutbox" DROP COLUMN "complaintId",
DROP COLUMN "processed",
ADD COLUMN     "payload" JSONB NOT NULL,
ADD COLUMN     "processAfter" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "ProcessStatus" NOT NULL,
DROP COLUMN "eventType",
ADD COLUMN     "eventType" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ComplaintEvent";
