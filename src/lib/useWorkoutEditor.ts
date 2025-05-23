import {useReducer} from 'react';
import {EditableUser,} from '@/types/editableData';
import {Exercise} from "@prisma/client";

type Action =
  | { type: 'ADD_WEEK' }
  | { type: 'REMOVE_WEEK'; weekId: string }
  | { type: 'DUPLICATE_WEEK'; weekId: string }
  | { type: 'ADD_WORKOUT'; weekId: string }
  | { type: 'REMOVE_WORKOUT'; weekId: string; workoutId: string; }
  | { type: 'MOVE_WORKOUT'; weekId: string; dir: 'up' | 'down', index: number }
  | { type: 'ADD_EXERCISE'; weekId: string; workoutId: string; }
  | { type: 'REMOVE_EXERCISE'; weekId: string; workoutId: string; exerciseId: string }
  | { type: 'MOVE_EXERCISE'; weekId: string; workoutId: string; dir: 'up' | 'down', index: number }
  | { type: 'ADD_SET'; weekId: string; workoutId: string; exerciseId: string }
  | { type: 'REMOVE_SET'; weekId: string; workoutId: string; exerciseId: string }
  | { type: 'UPDATE_WORKOUT_NAME'; weekId: string; workoutId: string; name: string }
  | { type: 'UPDATE_SET_WEIGHT'; workoutExerciseId: string; setId: string; weight: number }
  | { type: 'UPDATE_SET_REPS'; workoutExerciseId: string; setId: string; reps: number; }
  | { type: 'UPDATE_REP_RANGE'; workoutExerciseId: string; repRange: string; }
  | { type: 'UPDATE_REST_TIME'; workoutExerciseId: string; restTime: string; }
  | { type: "UPDATE_CATEGORY"; weekId: string; workoutId: string; workoutExerciseId: string; category: string; }
  | {
  type: "UPDATE_EXERCISE";
  weekId: string;
  workoutId: string;
  workoutExerciseId: string;
  exerciseId: string;
  exercises: Exercise[];
  category: string
}

function uuid() {
  return `tmp-${crypto.randomUUID()}`;
}

function reducer(state: EditableUser, action: Action): EditableUser {
  switch (action.type) {
    case 'ADD_WEEK':
      return <EditableUser>{
        ...state,
        weeks: [
          ...state.weeks,
          {
            id: uuid(),
            order: state.weeks.length + 1,
            workouts: [],
          },
        ],
      };

    case 'REMOVE_WEEK':
      return <EditableUser>{
        ...state,
        weeks: state.weeks.filter(week => week.id != action.weekId),
      };

    case 'ADD_WORKOUT':
      return <EditableUser>{
        ...state,
        weeks: state.weeks.map((week) =>
          week.id === action.weekId
            ? {
              ...week,
              workouts: [
                ...week.workouts,
                {
                  id: uuid(),
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

    case 'REMOVE_WORKOUT':
      return <EditableUser>{
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

    case 'ADD_EXERCISE':
      return <EditableUser>{
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
                        id: uuid(),
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
        weeks: state.weeks.map(week => {
          if (week.id !== weekId) return week;

          const workouts = [...week.workouts].sort((a, b) => a.order - b.order);
          const targetIndex = dir === 'up' ? index - 1 : index + 1;

          if (targetIndex < 0 || targetIndex >= workouts.length) return week;

          const updatedWorkouts = workouts.map(wo => ({...wo}));

          const temp = updatedWorkouts[index].order;
          updatedWorkouts[index].order = updatedWorkouts[targetIndex].order;
          updatedWorkouts[targetIndex].order = temp;

          return {
            ...week,
            workouts: updatedWorkouts.sort((a, b) => a.order - b.order),
          };
        }),
      };
    }

    case 'MOVE_EXERCISE': {
      const {weekId, workoutId, index, dir} = action;
      return {
        ...state,
        weeks: state.weeks.map(week => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            workouts: week.workouts.map(workout => {
              if (workout.id !== workoutId) return workout;

              const exercises = [...workout.exercises].sort((a, b) => a.order - b.order);
              const targetIndex = dir === 'up' ? index - 1 : index + 1;

              if (targetIndex < 0 || targetIndex >= exercises.length) return workout;

              const updatedExercises = exercises.map(ex => ({...ex}));

              const temp = updatedExercises[index].order;
              updatedExercises[index].order = updatedExercises[targetIndex].order;
              updatedExercises[targetIndex].order = temp;

              return {
                ...workout,
                exercises: updatedExercises.sort((a, b) => a.order - b.order),
              };
            }),
          };
        }),
      };
    }

    case 'REMOVE_EXERCISE':
      return <EditableUser>{
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
                              id: uuid(),
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

    case 'REMOVE_SET':
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

      return <EditableUser>{
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
      const {weekId, workoutId, workoutExerciseId, exerciseId, exercises, category} = action;

      const newExercise: Exercise =
        exercises.find((exercise) => exercise.id == exerciseId)
        || ({
          category
        } as Exercise)

      return <EditableUser>{
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
      return state;
  }
}

export function useWorkoutEditor(initialState: EditableUser) {
  const [state, dispatch] = useReducer(reducer, initialState);
  console.log(state)
  return {
    state,
    dispatch,
  };
}
