-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ExerciseCategory" AS ENUM ('resistance', 'cardio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (only if column is still text)
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'Exercise' AND column_name = 'category') = 'text' THEN
    ALTER TABLE "Exercise" ALTER COLUMN "category" TYPE "ExerciseCategory" USING (
      CASE
        WHEN "category" = 'Cardio' THEN 'cardio'::"ExerciseCategory"
        ELSE 'resistance'::"ExerciseCategory"
      END
    );
  END IF;
END $$;
