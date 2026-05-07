ALTER TABLE "CoachExerciseDescription"
RENAME TO "CoachExerciseNote";

ALTER INDEX "CoachExerciseDescription_pkey"
RENAME TO "CoachExerciseNote_pkey";

ALTER INDEX "CoachExerciseDescription_coachId_idx"
RENAME TO "CoachExerciseNote_coachId_idx";

ALTER INDEX "CoachExerciseDescription_coachId_exerciseId_key"
RENAME TO "CoachExerciseNote_coachId_exerciseId_key";

ALTER TABLE "CoachExerciseNote"
RENAME CONSTRAINT "CoachExerciseDescription_coachId_fkey" TO "CoachExerciseNote_coachId_fkey";

ALTER TABLE "CoachExerciseNote"
RENAME CONSTRAINT "CoachExerciseDescription_exerciseId_fkey" TO "CoachExerciseNote_exerciseId_fkey";

ALTER TABLE "CoachExerciseNote"
RENAME COLUMN "description" TO "note";

ALTER TABLE "CoachExerciseNote"
ADD COLUMN "url" TEXT;
