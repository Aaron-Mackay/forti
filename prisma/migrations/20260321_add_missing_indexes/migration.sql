-- CreateIndex
CREATE INDEX "DayMetric_userId_idx" ON "DayMetric"("userId");

-- CreateIndex
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");

-- CreateIndex
CREATE INDEX "Week_planId_idx" ON "Week"("planId");

-- CreateIndex
CREATE INDEX "Workout_weekId_idx" ON "Workout"("weekId");
