-- CreateTable: SupplementVersion
CREATE TABLE "SupplementVersion" (
    "id"            SERIAL NOT NULL,
    "supplementId"  INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "dosage"        TEXT NOT NULL,
    "frequency"     TEXT NOT NULL,
    "notes"         TEXT,
    CONSTRAINT "SupplementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplementVersion_supplementId_effectiveFrom_key"
    ON "SupplementVersion"("supplementId", "effectiveFrom");

CREATE INDEX "SupplementVersion_supplementId_effectiveFrom_idx"
    ON "SupplementVersion"("supplementId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "SupplementVersion"
    ADD CONSTRAINT "SupplementVersion_supplementId_fkey"
    FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: seed one version per existing supplement.
-- Use startDate as effectiveFrom when set; fall back to createdAt::date.
INSERT INTO "SupplementVersion" ("supplementId", "effectiveFrom", "dosage", "frequency", "notes")
SELECT "id",
       COALESCE("startDate", "createdAt"::date),
       "dosage",
       "frequency",
       "notes"
FROM "Supplement";

-- Drop old versioned columns from Supplement
ALTER TABLE "Supplement"
    DROP COLUMN "dosage",
    DROP COLUMN "frequency",
    DROP COLUMN "notes";
