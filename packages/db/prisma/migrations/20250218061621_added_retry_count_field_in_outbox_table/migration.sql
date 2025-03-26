-- AlterTable
ALTER TABLE "ComplaintOutbox" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
