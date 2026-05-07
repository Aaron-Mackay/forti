-- AlterTable
ALTER TABLE "AiUsageLog"
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "route" TEXT;

UPDATE "AiUsageLog"
SET "route" = 'unknown'
WHERE "route" IS NULL;

ALTER TABLE "AiUsageLog"
ALTER COLUMN "route" SET NOT NULL;
