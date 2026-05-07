-- Add composite indexes for measured hot paths.
CREATE INDEX "CoachRequest_coachId_status_createdAt_idx"
ON "CoachRequest"("coachId", status, "createdAt" DESC);

CREATE INDEX "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt" DESC);

CREATE INDEX "LearningPlanAssignment_clientId_startDate_idx"
ON "LearningPlanAssignment"("clientId", "startDate" DESC);

CREATE INDEX "Event_userId_startDate_endDate_idx"
ON "Event"("userId", "startDate", "endDate");

-- Remove superseded / redundant indexes to reduce write amplification.
DROP INDEX IF EXISTS "CoachRequest_coachId_idx";
DROP INDEX IF EXISTS "Event_userId_idx";
DROP INDEX IF EXISTS "Event_startDate_endDate_idx";
DROP INDEX IF EXISTS "DayMetric_userId_idx";
DROP INDEX IF EXISTS "UserExerciseNote_userId_idx";
DROP INDEX IF EXISTS "UserExerciseNote_exerciseId_idx";
DROP INDEX IF EXISTS "WeeklyCheckIn_userId_idx";
DROP INDEX IF EXISTS "Notification_userId_idx";
DROP INDEX IF EXISTS "LearningPlanAssignment_clientId_idx";
DROP INDEX IF EXISTS "LearningPlanAssignment_planId_idx";
