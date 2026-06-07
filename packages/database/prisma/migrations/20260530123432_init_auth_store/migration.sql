/*
  Warnings:

  - You are about to drop the column `apiKeyHash` on the `Store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[apiKey]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `AbandonedOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiKey` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiSecret` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AbandonedOrder" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "apiKeyHash",
ADD COLUMN     "apiKey" TEXT NOT NULL,
ADD COLUMN     "apiSecret" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Store_apiKey_key" ON "Store"("apiKey");
