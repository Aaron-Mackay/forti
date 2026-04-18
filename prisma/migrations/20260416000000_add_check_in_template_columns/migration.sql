-- Add coach check-in template column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "checkInTemplate" JSONB;

-- Add custom response columns to WeeklyCheckIn
ALTER TABLE "WeeklyCheckIn" ADD COLUMN IF NOT EXISTS "customResponses" JSONB;
ALTER TABLE "WeeklyCheckIn" ADD COLUMN IF NOT EXISTS "templateSnapshot" JSONB;
