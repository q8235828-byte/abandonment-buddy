-- AlterTable
ALTER TABLE "AbandonedOrder" ADD COLUMN     "isAbandoned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderStatus" TEXT;
