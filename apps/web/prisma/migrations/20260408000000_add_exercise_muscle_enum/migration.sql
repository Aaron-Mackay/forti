-- Add CHECK constraints to enforce allowed muscle values on Exercise
-- Idempotent: drops and re-adds the constraint to handle reruns cleanly

ALTER TABLE "Exercise"
  DROP CONSTRAINT IF EXISTS exercise_primary_muscles_valid,
  DROP CONSTRAINT IF EXISTS exercise_secondary_muscles_valid;

ALTER TABLE "Exercise"
  ADD CONSTRAINT exercise_primary_muscles_valid
    CHECK ("primaryMuscles" <@ ARRAY[
      'upper-traps','ant-delts','lat-delts','post-delts',
      'clav-pec','sternal-pec','biceps','triceps','forearms',
      'abs','obliques','mid-traps','lower-traps','lower-back',
      'lats','adductors','quads','glutes','hamstrings','calves'
    ]::text[]),
  ADD CONSTRAINT exercise_secondary_muscles_valid
    CHECK ("secondaryMuscles" <@ ARRAY[
      'upper-traps','ant-delts','lat-delts','post-delts',
      'clav-pec','sternal-pec','biceps','triceps','forearms',
      'abs','obliques','mid-traps','lower-traps','lower-back',
      'lats','adductors','quads','glutes','hamstrings','calves'
    ]::text[]);
