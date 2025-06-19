import {SetPrisma, UserPrisma, WeekPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";
import {Exercise} from "@prisma/client";
import {CreateUuid, Dir} from "@lib/useWorkoutEditor";

export function addExercise(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  createUuid: CreateUuid
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === workoutId
              ? {
                ...workout,
                exercises: [
                  ...workout.exercises,
                  {
                    id: createUuid(),
                    exerciseId: null,
                    repRange: "",
                    restTime: "",
                    order: workout.exercises.length + 1,
                    exercise: {
                      name: "N/A",
                    },
                    sets: [],
                  },
                ],
              }
              : workout
          ),
        }
        : week
    ),
  } as UserPrisma;
}

export function updateUserSets(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  newSets: SetPrisma[]
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {...ex, sets: newSets}
                ),
              }
          ),
        }
    ),
  };
}

export function addWeek(user: UserPrisma, createUuid: CreateUuid): UserPrisma {
  return {
    ...user,
    weeks: [
      ...user.weeks,
      {
        id: createUuid(),
        order: user.weeks.length + 1,
        workouts: [],
      },
    ],
  } as UserPrisma;
}

export function removeWeek(user: UserPrisma, weekId: number): UserPrisma {
  return {
    ...user,
    weeks: user.weeks
      .filter(w => w.id !== weekId)
      .map((w, idx) => ({...w, order: idx + 1})),
  };
}

export function addWorkout(user: UserPrisma, weekId: number, createUuid: CreateUuid): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
          ...week,
          workouts: [
            ...week.workouts,
            {
              id: createUuid(),
              name: "New Workout",
              order: week.workouts.length + 1,
              notes: "",
              exercises: [],
            },
          ],
        }
        : week
    ),
  } as UserPrisma;
}

export function removeWorkout(user: UserPrisma, weekId: number, workoutId: number): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
          ...week,
          workouts: week.workouts
            .filter(wo => wo.id !== workoutId)
            .map((wo, idx) => ({...wo, order: idx + 1})),
        }
        : week
    ),
  };
}

/**
 * Update the exercise for a specific workout exercise slot in a user plan.
 */
export function updateExercise(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  workoutExerciseId: number,
  exerciseName: string,
  exercises: Exercise[],
  category: string,
  createUuid: CreateUuid
): UserPrisma {
  const newExercise: Exercise =
    exercises.find(
      exercise =>
        exercise.category === category && exercise.name === exerciseName
    ) || {
      category,
      name: exerciseName,
      id: createUuid(),
      description: null,
    };

  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== workoutExerciseId
                    ? ex
                    : {
                      ...ex,
                      exercise: newExercise,
                    }
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Move a workout within the user for a particular week
 */
export function moveWorkout(
  user: UserPrisma,
  weekId: number,
  index: number,
  dir: Dir
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId ? moveWorkoutInWeek(week, index, dir) : week
    ),
  };
}

function moveWorkoutInWeek(
  week: WeekPrisma,
  index: number,
  dir: Dir
): WeekPrisma {
  const newWorkouts = [...week.workouts];
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= newWorkouts.length ||
    targetIndex < 0 ||
    targetIndex >= newWorkouts.length
  ) {
    return week;
  }
  const [removed] = newWorkouts.splice(index, 1);
  newWorkouts.splice(targetIndex, 0, removed);
  // Update order property if needed
  return {
    ...week,
    workouts: newWorkouts.map((w, i) => ({...w, order: i + 1})),
  };
}

/**
 * Move an exercise within a workout by index and direction.
 */
export function moveExerciseInWorkout(
  workout: WorkoutPrisma,
  index: number,
  dir: number
): WorkoutPrisma {
  const newExercises = [...workout.exercises];
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= newExercises.length ||
    targetIndex < 0 ||
    targetIndex >= newExercises.length
  ) {
    return workout;
  }
  const [removed] = newExercises.splice(index, 1);
  newExercises.splice(targetIndex, 0, removed);
  // Optionally update order property if needed
  return {
    ...workout,
    exercises: newExercises.map((ex, i) => ({...ex, order: i + 1})),
  };
}

/**
 * Move an exercise within a workout in a user's plan by index and direction.
 */
export function moveExercise(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  index: number,
  dir: number
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
            ...week,
            workouts: week.workouts.map(workout =>
              workout.id !== workoutId
                ? workout
                : moveExerciseInWorkout(workout, index, dir)
            ),
          }
    ),
  };
}

/**
 * Deeply duplicate a week, assigning new IDs and resetting set values.
 */
export function duplicateWeekData(
  week: WeekPrisma,
  newOrder: number,
  createUuid: CreateUuid
): WeekPrisma {
  return {
    ...week,
    order: newOrder,
    id: createUuid(),
    workouts: week.workouts.map(workout => duplicateWorkoutData(workout, createUuid)),
  };
}

/**
 * Deeply duplicate a workout, assigning new IDs and resetting set values.
 */
export function duplicateWorkoutData(
  workout: WorkoutPrisma,
  createUuid: CreateUuid
): WorkoutPrisma {
  return {
    ...workout,
    id: createUuid(),
    exercises: workout.exercises.map(exercise => duplicateExerciseData(exercise, createUuid)),
  };
}

/**
 * Deeply duplicate an exercise, assigning new IDs and resetting set values.
 */
export function duplicateExerciseData(
  exercise: WorkoutExercisePrisma,
  createUuid: CreateUuid
) {
  return {
    ...exercise,
    id: createUuid(),
    sets: exercise.sets.map(set => ({
      ...set,
      id: createUuid(),
      weight: null,
      reps: null,
    })),
  };
}

/**
 * Duplicate a week in the user plan.
 */
export function duplicateWeek(
  user: UserPrisma,
  weekId: number,
  createUuid: CreateUuid
): UserPrisma {
  const weekToDuplicate = user.weeks.find(w => w.id === weekId);
  if (!weekToDuplicate) return user;
  const duplicatedWeek = duplicateWeekData(weekToDuplicate, user.weeks.length + 1, createUuid);
  return {
    ...user,
    weeks: [...user.weeks, duplicatedWeek],
  };
}

/**
 * Remove an exercise from a workout in a given user's week by ID and reorders remaining.
 */
export function removeExercise(user: UserPrisma, weekId: number, workoutId: number, exerciseId: number): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === workoutId
              ? {
                ...workout,
                exercises: workout.exercises
                  .filter(ex => ex.id !== exerciseId)
                  .map((ex, idx) => ({...ex, order: idx + 1})),
              }
              : workout
          ),
        }
        : week
    ),
  };
}

/**
 * Add a set to a workout exercise, at the end of the sets
 */
export function addSet(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  createUuid: CreateUuid
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === workoutId
              ? {
                ...workout,
                exercises: workout.exercises.map(exercise =>
                  exercise.id === exerciseId
                    ? {
                      ...exercise,
                      sets: [
                        ...exercise.sets,
                        {
                          id: createUuid(),
                          workoutExerciseId: exerciseId,
                          order: exercise.sets.length + 1,
                          reps: null,
                          weight: null,
                        },
                      ],
                    }
                    : exercise
                ),
              }
              : workout
          ),
        }
        : week
    ),
  };
}

/**
 * Update the weight of a set in a specific exercise.
 */
export function updateSetWeight(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  setId: number,
  weight: string
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {
                      ...ex,
                      sets: ex.sets.map(set =>
                        set.id !== setId
                          ? set
                          : {...set, weight}
                      ),
                    }
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Update the reps of a set in a specific exercise.
 */
export function updateSetReps(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  setId: number,
  reps: number
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {
                      ...ex,
                      sets: ex.sets.map(set =>
                        set.id !== setId
                          ? set
                          : {...set, reps}
                      ),
                    }
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Update the repRange of a specific exercise in a workout.
 */
export function updateRepRange(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  repRange: string
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {...ex, repRange}
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Update the restTime of a specific exercise in a workout.
 */
export function updateRestTime(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  restTime: string
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {...ex, restTime}
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Update the category of a specific exercise in a workout.
 */
export function updateCategory(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  category: string
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== exerciseId
                    ? ex
                    : {
                      ...ex,
                      exercise: {
                        ...ex.exercise,
                        category,
                        name: "",
                      },
                    }
                ),
              }
          ),
        }
    ),
  };
}

/**
 * Remove the last set from a specific exercise and reorders remaining sets.
 */
export function removeLastSet(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id === weekId
        ? {
            ...week,
            workouts: week.workouts.map(workout =>
              workout.id === workoutId
                ? {
                    ...workout,
                    exercises: workout.exercises.map(exercise =>
                      exercise.id === exerciseId
                        ? {
                            ...exercise,
                            sets: exercise.sets
                              .slice(0, -1)
                              .map((set, idx) => ({ ...set, order: idx + 1 })),
                          }
                        : exercise
                    ),
                  }
                : workout
            ),
          }
        : week
    ),
  };
}

/**
 * Update the name of a specific workout in a week.
 */
export function updateWorkoutName(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  name: string
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id !== workoutId
              ? workout
              : { ...workout, name }
          ),
        }
    ),
  };
}