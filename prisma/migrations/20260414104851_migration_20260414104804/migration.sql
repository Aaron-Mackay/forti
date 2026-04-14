-- AlterTable
ALTER TABLE "AiUsageLog" ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "route" TEXT NOT NULL;

