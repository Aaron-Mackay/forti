import {useReducer} from 'react';
import {Exercise} from "@prisma/client";

import {UserPrisma, WeekPrisma, WorkoutPrisma} from "@/types/dataTypes";

export enum Dir {'UP', 'DOWN'}

export type WorkoutEditorAction =
  | { type: 'ADD_WEEK' }
  | { type: 'REMOVE_WEEK'; weekId: number }
  | { type: 'DUPLICATE_WEEK'; weekId: number }
  | { type: 'ADD_WORKOUT'; weekId: number }
  | { type: 'REMOVE_WORKOUT'; weekId: number; workoutId: number; }
  | { type: 'MOVE_WORKOUT'; weekId: number; dir: Dir, index: number }
  | { type: 'ADD_EXERCISE'; weekId: number; workoutId: number; }
  | { type: 'REMOVE_EXERCISE'; weekId: number; workoutId: number; exerciseId: number }
  | { type: 'MOVE_EXERCISE'; weekId: number; workoutId: number; dir: Dir, index: number }
  | { type: 'ADD_SET'; weekId: number; workoutId: number; exerciseId: number }
  | { type: 'REMOVE_SET'; weekId: number; workoutId: number; exerciseId: number }
  | { type: 'UPDATE_WORKOUT_NAME'; weekId: number; workoutId: number; name: string }
  | { type: 'UPDATE_SET_WEIGHT'; workoutExerciseId: number; setId: number; weight: string }
  | { type: 'UPDATE_SET_REPS'; workoutExerciseId: number; setId: number; reps: number; }
  | { type: 'UPDATE_REP_RANGE'; workoutExerciseId: number; repRange: string; }
  | { type: 'UPDATE_REST_TIME'; workoutExerciseId: number; restTime: string; }
  | { type: "UPDATE_CATEGORY"; weekId: number; workoutId: number; workoutExerciseId: number; category: string; }
  | {
  type: "UPDATE_EXERCISE";
  weekId: number;
  workoutId: number;
  workoutExerciseId: number;
  exerciseName: string;
  exercises: Exercise[];
  category: string
}

type CreateUuid = () => number;

export function reducer(state: UserPrisma, action: WorkoutEditorAction, createUuid: CreateUuid): UserPrisma {
  switch (action.type) {
    case 'ADD_WEEK':
      return <UserPrisma>{
        ...state,
        weeks: [
          ...state.weeks,
          {
            id: createUuid(),
            order: state.weeks.length + 1,
            workouts: [],
          },
        ],
      };

    case 'REMOVE_WEEK': {
      const exists = state.weeks.some(w => w.id === action.weekId);
      if (!exists) {
        devWarning(`Week ${action.weekId} does not exist`)
        return state
      }
      return <UserPrisma>{
        ...state,
        weeks: state.weeks.filter(week => week.id != action.weekId),
      };
    }


    case 'DUPLICATE_WEEK': {
      const weekToDuplicate = state.weeks.find(w => w.id === action.weekId);
      if (!weekToDuplicate) return state;
      const duplicatedWeek = duplicateWeek(weekToDuplicate, state.weeks.length + 1, createUuid);
      return {
        ...state,
        weeks: [...state.weeks, duplicatedWeek]
      };
    }

    case 'ADD_WORKOUT':
      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: [
                ...week.workouts,
                {
                  id: createUuid(),
                  name: 'New Workout',
                  order: week.workouts.length + 1,
                  notes: '',
                  exercises: [],
                },
              ],
            }
            : week
        ),
      };

    case 'REMOVE_WORKOUT': {
      const week = state.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist`);
        return state;
      }
      const exists = week.workouts.some(wo => wo.id === action.workoutId);
      if (!exists) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId}`);
        return state;
      }
      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.filter(wo => wo.id != action.workoutId)
            }
            : week
        ),
      };
    }

    case 'ADD_EXERCISE':
      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.map((workout) =>
                workout.id === action.workoutId
                  ? {
                    ...workout,
                    exercises: [
                      ...workout.exercises,
                      {
                        id: createUuid(),
                        exerciseId: null,
                        repRange: '',
                        restTime: '',
                        order: workout.exercises.length + 1,
                        exercise: {
                          name: "N/A"
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
      };

    case 'MOVE_WORKOUT': {
      const {weekId, index, dir} = action;
      return {
        ...state,
        weeks: state.weeks.map((week: WeekPrisma) =>
          week.id !== weekId ? week : moveWorkoutInWeek(week, index, dir)
        ),
      };
    }

    case 'MOVE_EXERCISE': {
      const {weekId, workoutId, index, dir} = action;
      return {
        ...state,
        weeks: state.weeks.map(week =>
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

    case 'REMOVE_EXERCISE': {
      const week = state.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist`);
        return state;
      }
      const workout = week.workouts.find(wo => wo.id === action.workoutId);
      if (!workout) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId}`);
        return state;
      }
      const exists = workout.exercises.some(ex => ex.id === action.exerciseId);
      if (!exists) {
        devWarning(`Exercise ${action.exerciseId} does not exist in workout ${action.workoutId} (week ${action.weekId})`);
        return state;
      }
      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.map((workout) =>
                workout.id === action.workoutId
                  ? {
                    ...workout,
                    exercises: workout.exercises.filter(ex => ex.id != action.exerciseId)
                  }
                  : workout
              ),
            }
            : week
        ),
      };
    }

    case 'ADD_SET':
      return {
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.map((workout) =>
                workout.id === action.workoutId
                  ? {
                    ...workout,
                    exercises: workout.exercises.map((exercise) =>
                      exercise.id === action.exerciseId
                        ? {
                          ...exercise,
                          sets: [
                            ...exercise.sets,
                            {
                              id: createUuid(),
                              workoutExerciseId: exercise.id,
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

    case 'REMOVE_SET': {
      const week = state.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist`);
        return state;
      }
      const workout = week.workouts.find(wo => wo.id === action.workoutId);
      if (!workout) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId}`);
        return state;
      }
      const exercise = workout.exercises.find(ex => ex.id === action.exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${action.exerciseId} does not exist in workout ${action.workoutId} (week ${action.weekId})`);
        return state;
      }
      if (!exercise.sets.length) {
        devWarning(`No sets to remove in exercise ${action.exerciseId} (workout ${action.workoutId}, week ${action.weekId})`);
        return state;
      }
      return {
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.map((workout) =>
                workout.id === action.workoutId
                  ? {
                    ...workout,
                    exercises: workout.exercises.map((exercise) =>
                      exercise.id === action.exerciseId
                        ? {
                          ...exercise,
                          sets: exercise.sets.slice(0, -1),
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

    case 'UPDATE_WORKOUT_NAME':
      return {
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: week.workouts.map((workout) =>
                workout.id === action.workoutId
                  ? {...workout, name: action.name}
                  : workout
              ),
            }
            : week
        ),
      };

    case 'UPDATE_SET_WEIGHT': {
      return {
        ...state,
        weeks: state.weeks.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => ({
            ...workout,
            exercises: workout.exercises.map(ex => {
              if (ex.id !== action.workoutExerciseId) return ex;

              return {
                ...ex,
                sets: ex.sets.map(set =>
                  set.id === action.setId ? {...set, weight: action.weight} : set
                ),
              };
            }),
          })),
        })),
      }
    }

    case 'UPDATE_SET_REPS': {
      const {setId, reps} = action;

      return {
        ...state,
        weeks: state.weeks.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => ({
            ...workout,
            exercises: workout.exercises.map(exercise => ({
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId
                  ? {...set, reps}
                  : set
              ),
            })),
          })),
        })),
      };
    }

    case 'UPDATE_REP_RANGE': {
      const {workoutExerciseId, repRange} = action;

      return {
        ...state,
        weeks: state.weeks.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => ({
            ...workout,
            exercises: workout.exercises.map(exercise =>
              exercise.id === workoutExerciseId
                ? {...exercise, repRange}
                : exercise
            ),
          })),
        })),
      };
    }

    case 'UPDATE_REST_TIME': {
      const {workoutExerciseId, restTime} = action;

      return {
        ...state,
        weeks: state.weeks.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => ({
            ...workout,
            exercises: workout.exercises.map(exercise =>
              exercise.id === workoutExerciseId
                ? {...exercise, restTime}
                : exercise
            ),
          })),
        })),
      };
    }

    case "UPDATE_CATEGORY": {
      const {weekId, workoutId, workoutExerciseId, category} = action;

      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map(week =>
          week.id !== weekId ? week : {
            ...week,
            workouts: week.workouts.map(workout =>
              workout.id !== workoutId ? workout : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== workoutExerciseId ? ex : {
                    ...ex,
                    exercise: {
                      // ...ex.exercise,
                      category,
                      // optionally reset name or id if changing category
                      name: "",
                      // id: 0,
                    },
                  }
                ),
              }
            ),
          }
        ),
      };
    }

    case "UPDATE_EXERCISE": {
      const {weekId, workoutId, workoutExerciseId, exerciseName, exercises, category} = action;

      const newExercise: Exercise =
        exercises.find(
          (exercise) =>
            exercise.category === category && exercise.name === exerciseName)
        || ({
          category,
          name: exerciseName,
          id: createUuid(),
          description: null
        })

      return <UserPrisma>{
        ...state,
        weeks: state.weeks.map(week =>
          week.id !== weekId ? week : {
            ...week,
            workouts: week.workouts.map(workout =>
              workout.id !== workoutId ? workout : {
                ...workout,
                exercises: workout.exercises.map(ex =>
                  ex.id !== workoutExerciseId ? ex : {
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

    default:
      assertNever(action); // TypeScript will error if a case is missing
  }
}

export function useWorkoutEditor(initialState: UserPrisma) {
  function createUuid(): number {
    const timestamp = Date.now(); // milliseconds since epoch
    const random = Math.floor(Math.random() * 1e6); // 6 random digits
    return Number(`${timestamp}${random}`);
  }

  const [state, dispatch] = useReducer(
    (state, action) => reducer(state, action, createUuid),
    initialState
  );
  return {
    state,
    dispatch,
  };
}


/**
 * Helper: Deep clone and re-ID a week and all nested items
 */
function duplicateWeek(week: WeekPrisma, newOrder: number, createUuid: CreateUuid) {
  return {
    ...week,
    order: newOrder,
    id: createUuid(),
    workouts: week.workouts.map(workout => ({
      ...workout,
      id: createUuid(),
      exercises: workout.exercises.map(exercise => ({
        ...exercise,
        id: createUuid(),
        sets: exercise.sets.map(set => ({
          ...set,
          id: createUuid(),
          weight: null,
          reps: null,
        }))
      }))
    }))
  };
}

/**
 * Helper: Move item order in an array and re-sort
 */
function moveOrder<T extends { order: number }>(
  arr: T[],
  fromIdx: number,
  toIdx: number
): T[] {
  const updated = arr.map(item => ({...item}));
  const temp = updated[fromIdx].order;
  updated[fromIdx].order = updated[toIdx].order;
  updated[toIdx].order = temp;
  return updated.sort((a, b) => a.order - b.order);
}

/**
 * Helper: Move a workout up or down within a week.
 */
function moveWorkoutInWeek(week: WeekPrisma, index: number, dir: Dir) {
  const workouts = [...week.workouts].sort((a, b) => a.order - b.order);
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= workouts.length) return week;
  return {
    ...week,
    workouts: moveOrder(workouts, index, targetIndex),
  };
}

/**
 * Helper: Move an exercise up or down within a workout.
 */
function moveExerciseInWorkout(workout: WorkoutPrisma, index: number, dir: Dir) {
  const exercises = [...workout.exercises].sort((a, b) => a.order - b.order);
  const targetIndex = dir === Dir.UP ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= exercises.length) return workout;
  return {
    ...workout,
    exercises: moveOrder(exercises, index, targetIndex),
  };
}

function assertNever(x: never): never {
  throw new Error("Unexpected action: " + x);
}

function devWarning(message: string) {
  if (process.env.NODE_ENV != "production") {
    console.warn(message)
  }
}