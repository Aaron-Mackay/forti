type WorkoutSummarySet = {
  id: number;
  reps: number | null;
  isDropSet: boolean;
  parentSetId: number | null;
  order: number;
};

type WorkoutSummaryExercise = {
  sets: WorkoutSummarySet[];
  exercise: {
    category: string | null;
    primaryMuscles: string[];
  };
};

type WorkoutSummaryWorkout = {
  id: number;
  name: string;
  exercises: WorkoutSummaryExercise[];
};

export type WorkoutSummary = {
  workoutId: number;
  workoutName: string;
  completedSets: number;
  plannedSets: number;
  muscleDoneSets: Array<{
    muscle: string;
    doneSets: number;
  }>;
};

function getDoneSetContribution(exercise: WorkoutSummaryExercise): number {
  const regularSets = exercise.sets.filter(set => !set.isDropSet);
  let doneContribution = 0;

  for (const regular of regularSets) {
    if (regular.reps !== null && regular.reps > 0) doneContribution += 1;
    const drops = exercise.sets
      .filter(set => set.isDropSet && set.parentSetId === regular.id)
      .sort((a, b) => a.order - b.order);
    for (const drop of drops) {
      if (drop.reps !== null && drop.reps > 0) doneContribution += 0.5;
    }
  }

  return doneContribution;
}

export function buildWorkoutSummaries<TWorkout extends WorkoutSummaryWorkout>(
  workouts: TWorkout[],
): WorkoutSummary[] {
  return workouts.map(workout => {
    const plannedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completedSets = workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(set => set.reps !== null && set.reps > 0).length,
      0,
    );
    const muscleDoneTotals = new Map<string, number>();

    for (const ex of workout.exercises) {
      if (ex.exercise.category !== 'resistance') continue;
      const doneContribution = getDoneSetContribution(ex);
      if (doneContribution <= 0) continue;

      for (const muscle of ex.exercise.primaryMuscles) {
        muscleDoneTotals.set(muscle, (muscleDoneTotals.get(muscle) ?? 0) + doneContribution);
      }
    }

    return {
      workoutId: workout.id,
      workoutName: workout.name,
      completedSets,
      plannedSets,
      muscleDoneSets: Array.from(muscleDoneTotals.entries()).map(([muscle, doneSets]) => ({
        muscle,
        doneSets,
      })),
    };
  });
}
