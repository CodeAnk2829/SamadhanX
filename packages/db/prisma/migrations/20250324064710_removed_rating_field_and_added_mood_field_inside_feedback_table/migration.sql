/*
  Warnings:

  - You are about to drop the column `comments` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Feedback` table. All the data in the column will be lost.
  - Added the required column `mood` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remarks` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "comments",
DROP COLUMN "rating",
ADD COLUMN     "mood" TEXT NOT NULL,
ADD COLUMN     "remarks" TEXT NOT NULL;
