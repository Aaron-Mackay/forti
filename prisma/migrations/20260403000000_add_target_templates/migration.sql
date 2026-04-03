-- CreateTable: TargetTemplate
CREATE TABLE "TargetTemplate" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepsTarget" INTEGER,
    "sleepMinsTarget" INTEGER,
    CONSTRAINT "TargetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TargetTemplateDay
CREATE TABLE "TargetTemplateDay" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "caloriesTarget" INTEGER,
    "proteinTarget" INTEGER,
    "carbsTarget" INTEGER,
    "fatTarget" INTEGER,
    CONSTRAINT "TargetTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex on TargetTemplate(userId, effectiveFrom)
CREATE UNIQUE INDEX "TargetTemplate_userId_effectiveFrom_key"
    ON "TargetTemplate"("userId", "effectiveFrom");

-- CreateUniqueIndex on TargetTemplateDay(templateId, dayOfWeek)
CREATE UNIQUE INDEX "TargetTemplateDay_templateId_dayOfWeek_key"
    ON "TargetTemplateDay"("templateId", "dayOfWeek");

-- AddForeignKey: TargetTemplate -> User
ALTER TABLE "TargetTemplate"
    ADD CONSTRAINT "TargetTemplate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: TargetTemplateDay -> TargetTemplate
ALTER TABLE "TargetTemplateDay"
    ADD CONSTRAINT "TargetTemplateDay_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "TargetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: migrate existing DayMetric target values into TargetTemplate / TargetTemplateDay.
-- date_trunc('week', ...) returns the ISO Monday of the week in PostgreSQL.
-- stepsTarget / sleepMinsTarget go to the header (uniform); macros go to per-day child rows.
WITH earliest_target_week AS (
  SELECT
    "userId",
    date_trunc('week', MIN("date")::timestamp)::date AS "effectiveFrom"
  FROM "DayMetric"
  WHERE "caloriesTarget" IS NOT NULL
     OR "proteinTarget"  IS NOT NULL
     OR "carbsTarget"    IS NOT NULL
     OR "fatTarget"      IS NOT NULL
     OR "stepsTarget"    IS NOT NULL
     OR "sleepMinsTarget" IS NOT NULL
  GROUP BY "userId"
),
weekly_uniform AS (
  SELECT DISTINCT ON (dm."userId")
    dm."userId",
    dm."stepsTarget",
    dm."sleepMinsTarget"
  FROM earliest_target_week etw
  JOIN "DayMetric" dm
    ON dm."userId" = etw."userId"
   AND dm."date" >= etw."effectiveFrom"
   AND dm."date" <  etw."effectiveFrom" + INTERVAL '7 days'
  WHERE dm."stepsTarget" IS NOT NULL OR dm."sleepMinsTarget" IS NOT NULL
  ORDER BY dm."userId", dm."date"
),
inserted_templates AS (
  INSERT INTO "TargetTemplate" ("userId", "effectiveFrom", "stepsTarget", "sleepMinsTarget")
  SELECT
    etw."userId",
    etw."effectiveFrom",
    wu."stepsTarget",
    wu."sleepMinsTarget"
  FROM earliest_target_week etw
  LEFT JOIN weekly_uniform wu ON wu."userId" = etw."userId"
  RETURNING "id", "userId", "effectiveFrom"
)
INSERT INTO "TargetTemplateDay"
  ("templateId", "dayOfWeek", "caloriesTarget", "proteinTarget", "carbsTarget", "fatTarget")
SELECT
  t."id",
  -- ISO weekday: Mon=1 ... Sun=7
  CASE EXTRACT(ISODOW FROM dm."date")::int
    WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4
    WHEN 5 THEN 5 WHEN 6 THEN 6 WHEN 7 THEN 7
  END,
  dm."caloriesTarget",
  dm."proteinTarget",
  dm."carbsTarget",
  dm."fatTarget"
FROM inserted_templates t
JOIN "DayMetric" dm
  ON dm."userId" = t."userId"
 AND dm."date" >= t."effectiveFrom"
 AND dm."date" <  t."effectiveFrom" + INTERVAL '7 days'
ON CONFLICT DO NOTHING;

-- AlterTable: drop old target columns from DayMetric
ALTER TABLE "DayMetric"
    DROP COLUMN "caloriesTarget",
    DROP COLUMN "proteinTarget",
    DROP COLUMN "carbsTarget",
    DROP COLUMN "fatTarget",
    DROP COLUMN "stepsTarget",
    DROP COLUMN "sleepMinsTarget";
