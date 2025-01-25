/*
  Warnings:

  - Added the required column `delegatedAt` to the `ComplaintDelegation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resolvedAt` to the `ComplaintResolution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `givenAt` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComplaintDelegation" ADD COLUMN     "delegatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ComplaintResolution" ADD COLUMN     "resolvedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "givenAt" TIMESTAMP(3) NOT NULL;
