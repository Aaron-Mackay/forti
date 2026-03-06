-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('resistance', 'cardio');

-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "category" TYPE "ExerciseCategory" USING (
  CASE 
    WHEN "category" = 'Cardio' THEN 'cardio'::"ExerciseCategory"
    ELSE 'resistance'::"ExerciseCategory"
  END
);
