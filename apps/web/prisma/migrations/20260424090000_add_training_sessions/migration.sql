-- Session foundations for workout + standalone cardio
CREATE TYPE "SessionType" AS ENUM ('workout', 'cardio');
CREATE TYPE "SessionStatus" AS ENUM ('planned', 'completed');

CREATE TABLE "TrainingSession" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionType" "SessionType" NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'completed',
  "performedAt" DATE NOT NULL,
  "workoutId" INTEGER,
  "activityType" TEXT,
  "durationSec" INTEGER,
  "distanceM" INTEGER,
  "avgPace" DOUBLE PRECISION,
  "avgHr" INTEGER,
  "calories" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingSession_workoutId_key" ON "TrainingSession"("workoutId");
CREATE INDEX "TrainingSession_userId_performedAt_idx" ON "TrainingSession"("userId", "performedAt" DESC);
CREATE INDEX "TrainingSession_userId_sessionType_performedAt_idx" ON "TrainingSession"("userId", "sessionType", "performedAt" DESC);
CREATE INDEX "TrainingSession_userId_status_performedAt_idx" ON "TrainingSession"("userId", "status", "performedAt" DESC);

ALTER TABLE "TrainingSession"
  ADD CONSTRAINT "TrainingSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingSession"
  ADD CONSTRAINT "TrainingSession_workoutId_fkey"
  FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing workout becomes a completed workout-type session.
INSERT INTO "TrainingSession" (
  "userId",
  "sessionType",
  "status",
  "performedAt",
  "workoutId",
  "createdAt",
  "updatedAt"
)
SELECT
  p."userId",
  'workout'::"SessionType",
  CASE WHEN w."dateCompleted" IS NULL THEN 'planned'::"SessionStatus" ELSE 'completed'::"SessionStatus" END,
  COALESCE(w."dateCompleted", CURRENT_DATE)::date,
  w."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Workout" w
JOIN "Week" wk ON wk."id" = w."weekId"
JOIN "Plan" p ON p."id" = wk."planId";
