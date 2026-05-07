import type {WorkoutExercisePrisma} from '@/types/dataTypes';

export type WorkoutExerciseGroup = {
  key: string;
  exerciseId: number;
  exercise: WorkoutExercisePrisma['exercise'];
  items: WorkoutExercisePrisma[];
};

export function getWorkoutExerciseGroupKey(ex: WorkoutExercisePrisma): string {
  return [
    ex.exerciseId,
    ex.exercise.category ?? 'unknown',
  ].join(':');
}

export function groupWorkoutExercises(
  exercises: WorkoutExercisePrisma[],
): WorkoutExerciseGroup[] {
  const groups = new Map<string, WorkoutExerciseGroup>();

  for (const ex of exercises) {
    const key = getWorkoutExerciseGroupKey(ex);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(ex);
      continue;
    }

    groups.set(key, {
      key,
      exerciseId: ex.exerciseId,
      exercise: ex.exercise,
      items: [ex],
    });
  }

  return Array.from(groups.values());
}
