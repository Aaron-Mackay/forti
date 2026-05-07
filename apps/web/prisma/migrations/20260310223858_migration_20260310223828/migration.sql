-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "isAdded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "substitutedForId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_substitutedForId_fkey" FOREIGN KEY ("substitutedForId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
