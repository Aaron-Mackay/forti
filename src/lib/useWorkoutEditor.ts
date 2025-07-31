import {useReducer} from 'react';
import {Exercise} from "@prisma/client";

import {UserPrisma} from "@/types/dataTypes";
import * as userPlanMutators from "@/utils/userPlanMutators";

export enum Dir {'UP', 'DOWN'}

export type WorkoutEditorAction =
  | { type: 'ADD_WEEK'; planId: number }
  | { type: 'REMOVE_WEEK'; planId: number, weekId: number }
  | { type: 'DUPLICATE_WEEK'; planId: number, weekId: number }
  | { type: 'ADD_WORKOUT'; planId: number, weekId: number }
  | { type: 'REMOVE_WORKOUT'; planId: number, weekId: number; workoutId: number; }
  | { type: 'MOVE_WORKOUT'; planId: number, weekId: number; dir: Dir, index: number }
  | { type: 'ADD_EXERCISE'; planId: number, weekId: number; workoutId: number; }
  | { type: 'REMOVE_EXERCISE'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'MOVE_EXERCISE'; planId: number, weekId: number; workoutId: number; dir: Dir, index: number }
  | { type: 'ADD_SET'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'REMOVE_SET'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'UPDATE_WORKOUT_NAME'; planId: number, weekId: number; workoutId: number; name: string }
  | { type: 'UPDATE_SET_WEIGHT'; planId: number, weekId: number; workoutId: number; exerciseId: number; setId: number; weight: string }
  | { type: 'UPDATE_SET_REPS'; planId: number, weekId: number; workoutId: number; exerciseId: number; setId: number; reps: number }
  | { type: 'UPDATE_REP_RANGE'; planId: number, weekId: number, workoutId: number, workoutExerciseId: number; repRange: string; }
  | { type: 'UPDATE_REST_TIME'; planId: number, weekId: number, workoutId: number, workoutExerciseId: number; restTime: string; }
  | { type: "UPDATE_CATEGORY"; planId: number, weekId: number; workoutId: number; workoutExerciseId: number; category: string; }
  | {
  type: "UPDATE_EXERCISE";
  planId: number,
  weekId: number;
  workoutId: number;
  workoutExerciseId: number;
  exerciseName: string;
  exercises: Exercise[];
  category: string
}

export type CreateUuid = () => number;

export function reducer(userDataState: UserPrisma, action: WorkoutEditorAction, createUuid: CreateUuid): UserPrisma {
  function getPlan(planId: number) {
    return userDataState.plans.find(p => p.id === planId);
  }

  switch (action.type) {
    case 'ADD_WEEK':
      return userPlanMutators.addWeek(userDataState, action.planId, createUuid);

    case 'REMOVE_WEEK': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const exists = plan.weeks.some(w => w.id === action.weekId);
      if (!exists) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      return userPlanMutators.removeWeek(userDataState, action.planId, action.weekId)
    }

    case 'DUPLICATE_WEEK': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const weekToDuplicate = plan.weeks.find(w => w.id === action.weekId);
      if (!weekToDuplicate) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      return userPlanMutators.duplicateWeek(userDataState, action.planId, action.weekId, createUuid)
    }

    case 'ADD_WORKOUT': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const week = plan.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      return userPlanMutators.addWorkout(userDataState, action.planId, action.weekId, createUuid)
    }

    case 'REMOVE_WORKOUT': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const week = plan.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const exists = week.workouts.some(wo => wo.id === action.workoutId);
      if (!exists) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId} (plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.removeWorkout(userDataState, action.planId, action.weekId, action.workoutId)
    }

    case 'ADD_EXERCISE': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const week = plan.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === action.workoutId);
      if (!workout) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId} (plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.addExercise(userDataState, action.planId, action.weekId, action.workoutId, createUuid)
    }

    case 'MOVE_WORKOUT': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, index, dir} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      return userPlanMutators.moveWorkout(userDataState, action.planId, weekId, index, dir)
    }

    case 'MOVE_EXERCISE': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, index, dir} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.moveExercise(userDataState, action.planId, weekId, workoutId, index, dir)
    }

    case 'REMOVE_EXERCISE': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const week = plan.weeks.find(w => w.id === action.weekId);
      if (!week) {
        devWarning(`Week ${action.weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === action.workoutId);
      if (!workout) {
        devWarning(`Workout ${action.workoutId} does not exist in week ${action.weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exists = workout.exercises.some(ex => ex.id === action.exerciseId);
      if (!exists) {
        devWarning(`Exercise ${action.exerciseId} does not exist in workout ${action.workoutId} (week ${action.weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.removeExercise(userDataState, action.planId, action.weekId, action.workoutId, action.exerciseId)
    }

    case 'ADD_SET': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, exerciseId} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.addSet(userDataState, action.planId, weekId, workoutId, exerciseId, createUuid)
    }

    case 'REMOVE_SET': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, exerciseId} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      if (!exercise.sets.length) {
        devWarning(`No sets to remove in exercise ${exerciseId} (workout ${workoutId}, week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.removeLastSet(userDataState, action.planId, weekId, workoutId, exerciseId)
    }

    case 'UPDATE_WORKOUT_NAME': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, name} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateWorkoutName(userDataState, action.planId, weekId, workoutId, name)
    }

    case 'UPDATE_SET_WEIGHT': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, exerciseId, setId, weight} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      const set = exercise.sets.find(s => s.id === setId);
      if (!set) {
        devWarning(`Set ${setId} does not exist in exercise ${exerciseId} (workout ${workoutId}, week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateSetWeight(userDataState, action.planId, weekId, workoutId, exerciseId, setId, weight);
    }

    case 'UPDATE_SET_REPS': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, exerciseId, setId, reps} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      const set = exercise.sets.find(s => s.id === setId);
      if (!set) {
        devWarning(`Set ${setId} does not exist in exercise ${exerciseId} (workout ${workoutId}, week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateSetReps(userDataState, action.planId, weekId, workoutId, exerciseId, setId, reps);
    }

    case 'UPDATE_REP_RANGE': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, workoutExerciseId: exerciseId, repRange} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateRepRange(userDataState, action.planId, weekId, workoutId, exerciseId, repRange);
    }

    case 'UPDATE_REST_TIME': {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, workoutExerciseId: exerciseId, restTime} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) {
        devWarning(`Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateRestTime(userDataState, action.planId, weekId, workoutId, exerciseId, restTime);
    }

    case "UPDATE_CATEGORY": {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, workoutExerciseId, category} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === workoutExerciseId);
      if (!exercise) {
        devWarning(`Exercise ${workoutExerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateCategory(userDataState, action.planId, weekId, workoutId, workoutExerciseId, category);
    }

    case "UPDATE_EXERCISE": {
      const plan = getPlan(action.planId);
      if (!plan) {
        devWarning(`Plan ${action.planId} does not exist`);
        return userDataState;
      }
      const {weekId, workoutId, workoutExerciseId, exerciseName, exercises, category} = action;
      const week = plan.weeks.find(w => w.id === weekId);
      if (!week) {
        devWarning(`Week ${weekId} does not exist in plan ${action.planId}`);
        return userDataState;
      }
      const workout = week.workouts.find(wo => wo.id === workoutId);
      if (!workout) {
        devWarning(`Workout ${workoutId} does not exist in week ${weekId} (plan ${action.planId})`);
        return userDataState;
      }
      const exercise = workout.exercises.find(ex => ex.id === workoutExerciseId);
      if (!exercise) {
        devWarning(`Exercise ${workoutExerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${action.planId})`);
        return userDataState;
      }
      return userPlanMutators.updateExerciseInUser(userDataState, action.planId, weekId, workoutId, workoutExerciseId, exerciseName, exercises, category, createUuid)
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