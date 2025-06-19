import {useReducer} from 'react';
import {Exercise} from "@prisma/client";

import {UserPrisma} from "@/types/dataTypes";
import * as userPlanMutators from "@/utils/userPlanMutators";

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
  | { type: 'UPDATE_SET_WEIGHT'; weekId: number; workoutId: number; exerciseId: number; setId: number; weight: string }
  | { type: 'UPDATE_SET_REPS'; weekId: number; workoutId: number; exerciseId: number; setId: number; reps: number }
  | { type: 'UPDATE_REP_RANGE'; weekId: number, workoutId: number, workoutExerciseId: number; repRange: string; }
  | { type: 'UPDATE_REST_TIME'; weekId: number, workoutId: number, workoutExerciseId: number; restTime: string; }
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

export type CreateUuid = () => number;

export function reducer(state: UserPrisma, action: WorkoutEditorAction, createUuid: CreateUuid): UserPrisma {
  switch (action.type) {
    case 'ADD_WEEK':
      return userPlanMutators.addWeek(state, createUuid);

    case 'REMOVE_WEEK': {
      const exists = state.weeks.some(w => w.id === action.weekId);
      if (!exists) {
        devWarning(`Week ${action.weekId} does not exist`)
        return state
      }
      return userPlanMutators.removeWeek(state, action.weekId)
    }


    case 'DUPLICATE_WEEK': {
      const weekToDuplicate = state.weeks.find(w => w.id === action.weekId);
      if (!weekToDuplicate) return state;
      return userPlanMutators.duplicateWeek(state, action.weekId, createUuid)
    }

    case 'ADD_WORKOUT':
      return userPlanMutators.addWorkout(state, action.weekId, createUuid)

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
      return userPlanMutators.removeWorkout(state, action.weekId, action.workoutId)
    }

    case 'ADD_EXERCISE':
      return userPlanMutators.addExercise(state, action.weekId, action.workoutId, createUuid)

    case 'MOVE_WORKOUT': {
      const {weekId, index, dir} = action;
      const week = state.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist`);
        return state;
      }
      return userPlanMutators.moveWorkout(state, weekId, index, dir)
    }

    case 'MOVE_EXERCISE': {
      const {weekId, workoutId, index, dir} = action;
      return userPlanMutators.moveExercise(state, weekId, workoutId, index, dir)
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
      return userPlanMutators.removeExercise(state, action.weekId, action.workoutId, action.exerciseId)
    }

    case 'ADD_SET': {
      const {weekId, workoutId, exerciseId} = action
      return userPlanMutators.addSet(state, weekId, workoutId, exerciseId, createUuid)
    }

    case 'REMOVE_SET': {
      const {weekId, workoutId, exerciseId} = action
      const week = state.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist`);
        return state;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId}`);
        return state;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId})`);
        return state;
      }
      if (!exercise.sets.length) {
        devWarning(`No sets to remove in exercise ${exerciseId} (workout ${workoutId}, week ${weekId})`);
        return state;
      }
      return userPlanMutators.removeLastSet(state, weekId, workoutId, exerciseId)
    }

    case 'UPDATE_WORKOUT_NAME': {
      const {weekId, workoutId, name} = action
      return userPlanMutators.updateWorkoutName(state, weekId, workoutId, name)
    }

    case 'UPDATE_SET_WEIGHT': {
      const {weekId, workoutId, exerciseId, setId, weight} = action;
      return userPlanMutators.updateSetWeight(state, weekId, workoutId, exerciseId, setId, weight);
    }

    case 'UPDATE_SET_REPS': {
      const {weekId, workoutId, exerciseId, setId, reps} = action;
      return userPlanMutators.updateSetReps(state, weekId, workoutId, exerciseId, setId, reps);
    }

    case 'UPDATE_REP_RANGE': {
      const {weekId, workoutId, workoutExerciseId: exerciseId, repRange} = action;
      return userPlanMutators.updateRepRange(state, weekId, workoutId, exerciseId, repRange);
    }

    case 'UPDATE_REST_TIME': {
      const {weekId, workoutId, workoutExerciseId: exerciseId, restTime} = action;
      return userPlanMutators.updateRestTime(state, weekId, workoutId, exerciseId, restTime);
    }

    case "UPDATE_CATEGORY": {
      const {weekId, workoutId, workoutExerciseId, category} = action;
      return userPlanMutators.updateCategory(state, weekId, workoutId, workoutExerciseId, category);
    }

    case "UPDATE_EXERCISE": {
      const {weekId, workoutId, workoutExerciseId, exerciseName, exercises, category} = action;
      return userPlanMutators.updateExercise(state, weekId, workoutId, workoutExerciseId, exerciseName, exercises, category, createUuid)
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

function assertNever(x: never): never {
  throw new Error("Unexpected action: " + x);
}

function devWarning(message: string) {
  if (process.env.NODE_ENV != "production") {
    console.warn(message)
  }
}