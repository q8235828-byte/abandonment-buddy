-- AlterTable
ALTER TABLE "AbandonedOrder" ADD COLUMN     "emailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" ALTER COLUMN "abandonmentTimeoutMin" SET DEFAULT 180;
