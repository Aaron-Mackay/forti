-- DropForeignKey
ALTER TABLE "DayMetric" DROP CONSTRAINT "DayMetric_userId_fkey";

-- CreateIndex
CREATE INDEX "CoachRequest_coachId_idx" ON "CoachRequest"("coachId");

-- AddForeignKey
ALTER TABLE "DayMetric" ADD CONSTRAINT "DayMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_parentSetId_fkey" FOREIGN KEY ("parentSetId") REFERENCES "ExerciseSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

