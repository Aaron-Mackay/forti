-- AddIndex: parent-lookup indexes for Plan, Week, Workout, DayMetric
-- (idempotent: uses IF NOT EXISTS in case a previous db push already created them)

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Plan_userId_idx" ON "Plan"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Week_planId_idx" ON "Week"("planId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Workout_weekId_idx" ON "Workout"("weekId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DayMetric_userId_idx" ON "DayMetric"("userId");
