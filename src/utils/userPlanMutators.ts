import {PlanPrisma, SetPrisma, UserPrisma, WeekPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";
import {Exercise} from "@prisma/client";
import {CreateUuid, Dir} from "@lib/useWorkoutEditor";

function updatePlan(user: UserPrisma, planId: number, updateFn: (plan: PlanPrisma) => PlanPrisma): UserPrisma {
  return {
    ...user,
    plans: user.plans.map(plan => (plan.id === planId ? updateFn(plan) : plan)),
  };
}

function updateWeek(plan: PlanPrisma, weekId: number, updateFn: (week: WeekPrisma) => WeekPrisma): PlanPrisma {
  return {
    ...plan,
    weeks: plan.weeks.map(week => (week.id === weekId ? updateFn(week) : week)),
  };
}

function updateWorkout(week: WeekPrisma, workoutId: number, updateFn: (workout: WorkoutPrisma) => WorkoutPrisma): WeekPrisma {
  return {
    ...week,
    workouts: week.workouts.map(workout => (workout.id === workoutId ? updateFn(workout) : workout)),
  };
}

function updateExercise(workout: WorkoutPrisma, exerciseId: number, updateFn: (exercise: WorkoutExercisePrisma) => WorkoutExercisePrisma): WorkoutPrisma {
  return {
    ...workout,
    exercises: workout.exercises.map(exercise => (exercise.id === exerciseId ? updateFn(exercise) : exercise)),
  };
}

function updateSet(exercise: WorkoutExercisePrisma, setId: number, updateFn: (set: SetPrisma) => SetPrisma): WorkoutExercisePrisma {
  return {
    ...exercise,
    sets: exercise.sets.map(set => (set.id === setId ? updateFn(set) : set)),
  };
}

export function updateExerciseInUser(
  user: UserPrisma,
  planId: number,
  weekId: number,
  workoutId: number,
  workoutExerciseId: number,
  exerciseName: string,
  exercises: Exercise[],
  category: string,
  createUuid: CreateUuid
): UserPrisma {
  //todo if exercise isn't in exercises, add it to db
  const newExercise = exercises.find(e => e.category === category && e.name === exerciseName) || {
    category,
    name: exerciseName,
    id: createUuid(),
    description: null,
  };

  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, workoutExerciseId, exercise => ({...exercise, exercise: newExercise}))
      )
    )
  );
}

export function updatePlanName(user: UserPrisma, planId: number, name: string): UserPrisma {
  return {
    ...user,
    plans: user.plans.map(plan =>
      plan.id === planId ? {...plan, name} : plan
    ),
  };
}

export function moveWorkout(user: UserPrisma, planId: number, weekId: number, index: number, dir: Dir): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week => moveWorkoutInWeek(week, index, dir))
  );
}

function moveWorkoutInWeek(week: WeekPrisma, index: number, dir: Dir): WeekPrisma {
  const newWorkouts = [...week.workouts];
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (index < 0 || index >= newWorkouts.length || targetIndex < 0 || targetIndex >= newWorkouts.length) {
    return week;
  }
  const [removed] = newWorkouts.splice(index, 1);
  newWorkouts.splice(targetIndex, 0, removed);
  return {
    ...week,
    workouts: newWorkouts.map((w, i) => ({...w, order: i + 1})),
  };
}

function moveExerciseInWorkout(workout: WorkoutPrisma, index: number, dir: number): WorkoutPrisma {
  const newExercises = [...workout.exercises];
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (index < 0 || index >= newExercises.length || targetIndex < 0 || targetIndex >= newExercises.length) {
    return workout;
  }
  const [removed] = newExercises.splice(index, 1);
  newExercises.splice(targetIndex, 0, removed);
  return {
    ...workout,
    exercises: newExercises.map((ex, i) => ({...ex, order: i + 1})),
  };
}

export function moveExercise(user: UserPrisma, planId: number, weekId: number, workoutId: number, index: number, dir: number): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout => moveExerciseInWorkout(workout, index, dir))
    )
  );
}

export function duplicateWeek(user: UserPrisma, planId: number, weekId: number, createUuid: CreateUuid): UserPrisma {
  return updatePlan(user, planId, plan => ({
    ...plan,
    weeks: [
      ...plan.weeks,
      duplicateWeekData(plan.weeks.find(w => w.id === weekId)!, plan.weeks.length + 1, createUuid),
    ],
  }));
}

export function duplicateWorkout(user: UserPrisma, planId: number, weekId: number, workoutId: number, createUuid: CreateUuid): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week => ({
        ...week,
        workouts: [
          ...week.workouts,
          duplicateWorkoutData(week.workouts.find(wo => wo.id === workoutId)!, createUuid, week.workouts.length + 1),
        ]
      })
    )
  );
}

function duplicateWeekData(week: WeekPrisma, newOrder: number, createUuid: CreateUuid): WeekPrisma {
  return {
    ...week,
    id: createUuid(),
    order: newOrder,
    workouts: week.workouts.map(workout => duplicateWorkoutData(workout, createUuid)),
  };
}

function duplicateWorkoutData(workout: WorkoutPrisma, createUuid: CreateUuid, newOrder?: number): WorkoutPrisma {
  return {
    ...workout,
    order: newOrder || workout.order,
    id: createUuid(),
    exercises: workout.exercises.map(ex => duplicateExerciseData(ex, createUuid)),
  };
}

function duplicateExerciseData(exercise: WorkoutExercisePrisma, createUuid: CreateUuid): WorkoutExercisePrisma {
  return {
    ...exercise,
    id: createUuid(),
    sets: exercise.sets.map(set => ({...set, id: createUuid(), weight: null, reps: null})),
  };
}

export function removeExercise(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout => ({
        ...workout,
        exercises: workout.exercises.filter(ex => ex.id !== exerciseId).map((ex, idx) => ({...ex, order: idx + 1})),
      }))
    )
  );
}

export function addSet(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, createUuid: CreateUuid): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({
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
        }))
      )
    )
  );
}

export function updateSetCount(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, setCount: number, createUuid: CreateUuid): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => {
          if (setCount < exercise.sets.length) {
            const sortedSets = [...exercise.sets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            return {
              ...exercise,
              sets: sortedSets.slice(0, setCount).map((set, idx) => ({...set, order: idx + 1})),
            };
          }
          if (setCount > exercise.sets.length) {
            return {
              ...exercise,
              sets: [
                ...exercise.sets,
                ...Array.from({length: setCount - exercise.sets.length}).map((_, idx) => ({
                  id: createUuid(),
                  workoutExerciseId: exerciseId,
                  order: exercise.sets.length + idx + 1,
                  reps: null,
                  weight: null,
                })),
              ],
            };
          }
          return exercise;
        })
      )
    )
  );
}

export function updateSetWeight(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, setId: number, weight: string): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise =>
          updateSet(exercise, setId, set => ({...set, weight}))
        )
      )
    )
  );
}

export function updateSetReps(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, setId: number, reps: number): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise =>
          updateSet(exercise, setId, set => ({...set, reps}))
        )
      )
    )
  );
}

export function updateRepRange(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, repRange: string): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({...exercise, repRange}))
      )
    )
  );
}

export function updateRestTime(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, restTime: string): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({...exercise, restTime}))
      )
    )
  );
}

export function updateCategory(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number, category: string): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({
          ...exercise,
          exercise: {...exercise.exercise, category, name: ""},
        }))
      )
    )
  );
}

export function removeLastSet(user: UserPrisma, planId: number, weekId: number, workoutId: number, exerciseId: number): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({
          ...exercise,
          sets: exercise.sets.slice(0, -1).map((set, idx) => ({...set, order: idx + 1})),
        }))
      )
    )
  );
}

export function updateWorkoutName(user: UserPrisma, planId: number, weekId: number, workoutId: number, name: string): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout => ({...workout, name}))
    )
  );
}

export function updateUserSets(
  user: UserPrisma,
  planId: number,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  newSets: SetPrisma[]
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout =>
        updateExercise(workout, exerciseId, exercise => ({...exercise, sets: newSets}))
      )
    )
  );
}

export function addExercise(
  user: UserPrisma,
  planId: number,
  weekId: number,
  workoutId: number,
  createUuid: CreateUuid
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout => ({
        ...workout,
        exercises: [
          ...workout.exercises,
          {
            id: createUuid(),
            exerciseId: dummyExercise.id,
            repRange: "",
            restTime: "",
            order: workout.exercises.length + 1,
            exercise: dummyExercise,
            sets: [],
            workoutId: workout.id,
            notes: "",
          },
        ],
      }))
    )
  );
}

export function addExerciseWithSet(
  user: UserPrisma,
  planId: number,
  weekId: number,
  workoutId: number,
  createUuid: CreateUuid
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week =>
      updateWorkout(week, workoutId, workout => {
        const newExerciseId = createUuid();
        return {
          ...workout,
          exercises: [
            ...workout.exercises,
            {
              id: newExerciseId,
              exerciseId: dummyExercise.id,
              repRange: "",
              restTime: "",
              order: workout.exercises.length + 1,
              exercise: dummyExercise,
              sets: [
                {
                  id: createUuid(),
                  workoutExerciseId: newExerciseId,
                  order: 1,
                  reps: null,
                  weight: null,
                }
              ],
              workoutId: workout.id,
              notes: "",
            },
          ],
        };
      })
    )
  );
}

export function addWeek(
  user: UserPrisma,
  planId: number,
  createUuid: CreateUuid
): UserPrisma {
  return updatePlan(user, planId, plan => ({
    ...plan,
    weeks: [
      ...plan.weeks,
      {
        id: createUuid(),
        order: plan.weeks.length + 1,
        workouts: [],
        planId,
      },
    ],
  }));
}

export function removeWeek(
  user: UserPrisma,
  planId: number,
  weekId: number
): UserPrisma {
  return updatePlan(user, planId, plan => ({
    ...plan,
    weeks: plan.weeks
      .filter(week => week.id !== weekId)
      .map((week, idx) => ({...week, order: idx + 1})),
  }));
}

export function addWorkout(
  user: UserPrisma,
  planId: number,
  weekId: number,
  createUuid: CreateUuid
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week => ({
      ...week,
      workouts: [
        ...week.workouts,
        {
          id: createUuid(),
          name: `Workout ${week.workouts.length + 1}`,
          order: week.workouts.length + 1,
          notes: "",
          exercises: [],
          weekId,
          dateCompleted: null,
        },
      ],
    }))
  );
}

export function addWorkoutWithExerciseWithSet(
  user: UserPrisma,
  planId: number,
  weekId: number,
  createUuid: CreateUuid
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week => {
      const newWorkoutId = createUuid()
      const newExerciseId = createUuid()
      return {
        ...week,
        workouts: [
          ...week.workouts,
          {
            id: newWorkoutId,
            name: `Workout ${week.workouts.length + 1}`,
            order: week.workouts.length + 1,
            notes: "",
            exercises: [
              {
                id: newExerciseId,
                exerciseId: dummyExercise.id,
                repRange: "",
                restTime: "",
                order: 1,
                exercise: dummyExercise,
                sets: [
                  {
                    id: createUuid(),
                    workoutExerciseId: newExerciseId,
                    order: 1,
                    reps: null,
                    weight: null,
                  }
                ],
                workoutId: newWorkoutId,
                notes: "",
              },
            ],
            weekId,
            dateCompleted: null,
          },
        ],
      }
    })
  );
}

export function removeWorkout(
  user: UserPrisma,
  planId: number,
  weekId: number,
  workoutId: number
): UserPrisma {
  return updatePlan(user, planId, plan =>
    updateWeek(plan, weekId, week => ({
      ...week,
      workouts: week.workouts
        .filter(workout => workout.id !== workoutId)
        .map((workout, idx) => ({...workout, order: idx + 1})),
    }))
  );
}

const dummyExercise: Exercise = {
  id: -1,
  category: "none",
  name: "",
  description: null,
};