-- AlterTable
ALTER TABLE "ExerciseSet" ADD COLUMN     "isDropSet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentSetId" INTEGER;
