-- AlterTable: change weight from text to double precision
ALTER TABLE "ExerciseSet" ALTER COLUMN "weight" TYPE DOUBLE PRECISION USING weight::double precision;
