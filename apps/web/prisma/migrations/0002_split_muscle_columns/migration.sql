-- Split Exercise.muscles into primaryMuscles and secondaryMuscles
ALTER TABLE "Exercise" ADD COLUMN "primaryMuscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Exercise" ADD COLUMN "secondaryMuscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Exercise" SET "primaryMuscles" = muscles;
ALTER TABLE "Exercise" DROP COLUMN "muscles";
