-- AlterTable
ALTER TABLE "AbandonedOrder" ADD COLUMN     "customerBrowser" TEXT,
ADD COLUMN     "customerCity" TEXT,
ADD COLUMN     "customerCountry" TEXT,
ADD COLUMN     "customerDevice" TEXT,
ADD COLUMN     "customerIp" TEXT,
ADD COLUMN     "customerIsp" TEXT,
ADD COLUMN     "customerOs" TEXT,
ADD COLUMN     "customerRegion" TEXT;
