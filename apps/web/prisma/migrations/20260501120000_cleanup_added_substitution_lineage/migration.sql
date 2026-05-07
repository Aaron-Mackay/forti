UPDATE "WorkoutExercise"
SET "substitutedForId" = NULL
WHERE "isAdded" = true
  AND "substitutedForId" IS NOT NULL;
