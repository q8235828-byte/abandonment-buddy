-- AlterTable
ALTER TABLE "AbandonedOrder" ADD COLUMN     "abVariant" TEXT,
ADD COLUMN     "emailClickedAt" TIMESTAMP(3),
ADD COLUMN     "emailOpenedAt" TIMESTAMP(3),
ADD COLUMN     "emailStep2SentAt" TIMESTAMP(3),
ADD COLUMN     "emailStep3SentAt" TIMESTAMP(3),
ADD COLUMN     "recoveredBy" TEXT,
ADD COLUMN     "recoveredByStep" INTEGER,
ADD COLUMN     "smsSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "abTestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "abVariantBSubject" TEXT,
ADD COLUMN     "abVariantBTemplate" TEXT,
ADD COLUMN     "emailStep2DelayMin" INTEGER,
ADD COLUMN     "emailStep2Subject" TEXT,
ADD COLUMN     "emailStep2Template" TEXT,
ADD COLUMN     "emailStep3DelayMin" INTEGER,
ADD COLUMN     "emailStep3Subject" TEXT,
ADD COLUMN     "emailStep3Template" TEXT;
