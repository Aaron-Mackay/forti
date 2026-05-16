type WorkoutDurationSet = {
  reps?: number | null;
  weight?: number | null;
};

type WorkoutDurationExercise = {
  restTime?: string | null;
  sets: WorkoutDurationSet[];
};

type WorkoutDurationWorkout = {
  exercises: WorkoutDurationExercise[];
};

const DEFAULT_REST_SECONDS = 120;
const PER_SET_SECONDS = 45;
const WARMUP_SECONDS_PER_EXERCISE = 180;

export function parseWorkoutRestSeconds(restTime: string | null | undefined): number {
  if (!restTime) return DEFAULT_REST_SECONDS;

  const normalized = restTime.trim().toLowerCase();
  if (!normalized) return DEFAULT_REST_SECONDS;

  const rangeMatch = normalized.match(/^(\d+)\s*s?\s*-\s*(\d+)\s*s?$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return Math.round((start + end) / 2);
    }
  }

  const singleMatch = normalized.match(/^(\d+)\s*s?$/);
  if (singleMatch) {
    const seconds = Number(singleMatch[1]);
    if (Number.isFinite(seconds)) {
      return seconds;
    }
  }

  return DEFAULT_REST_SECONDS;
}

export function estimateWorkoutMinutes(workout: WorkoutDurationWorkout): number {
  const totalSeconds = workout.exercises.reduce((sum, exercise) => {
    const setCount = exercise.sets.length;
    const restSeconds = parseWorkoutRestSeconds(exercise.restTime);
    return sum + (setCount * (restSeconds + PER_SET_SECONDS)) + WARMUP_SECONDS_PER_EXERCISE;
  }, 0);

  return totalSeconds;
}

export function estimateWorkoutRemainingSeconds(workout: WorkoutDurationWorkout): number {
  return workout.exercises.reduce((sum, exercise) => {
    const restSeconds = parseWorkoutRestSeconds(exercise.restTime);
    const completedSetCount = exercise.sets.filter((set) => set.reps != null || set.weight != null).length;
    const remainingSetCount = Math.max(exercise.sets.length - completedSetCount, 0);
    const warmupSeconds = completedSetCount > 0 ? 0 : WARMUP_SECONDS_PER_EXERCISE;

    return sum + (remainingSetCount * (restSeconds + PER_SET_SECONDS)) + warmupSeconds;
  }, 0);
}
