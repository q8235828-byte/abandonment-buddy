-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "customEmailLimit" INTEGER,
ADD COLUMN     "customOrderLimit" INTEGER,
ADD COLUMN     "customSmsLimit" INTEGER,
ADD COLUMN     "customWhatsappLimit" INTEGER,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT;
