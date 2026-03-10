import {useReducer} from 'react';
import {Exercise} from "@prisma/client";

import {PlanPrisma, SetPrisma, UserPrisma, WeekPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";
import * as userPlanMutators from "@/utils/userPlanMutators";

export enum Dir {'UP', 'DOWN'}

export type WorkoutEditorAction =
  | { type: 'UPDATE_PLAN_NAME'; planId: number; name: string }
  | { type: 'ADD_WEEK'; planId: number }
  | { type: 'REMOVE_WEEK'; planId: number, weekId: number }
  | { type: 'DUPLICATE_WEEK'; planId: number, weekId: number }
  | { type: 'DUPLICATE_WORKOUT'; planId: number, weekId: number, workoutId: number }
  | { type: 'ADD_WORKOUT'; planId: number, weekId: number }
  | { type: 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET'; planId: number, weekId: number }
  | { type: 'REMOVE_WORKOUT'; planId: number, weekId: number; workoutId: number; }
  | { type: 'MOVE_WORKOUT'; planId: number, weekId: number; dir: Dir, index: number }
  | { type: 'REORDER_WORKOUT'; planId: number, weekId: number; fromIndex: number; toIndex: number }
  | { type: 'ADD_EXERCISE'; planId: number, weekId: number; workoutId: number; }
  | { type: 'ADD_EXERCISE_WITH_SET'; planId: number, weekId: number; workoutId: number; }
  | { type: 'REMOVE_EXERCISE'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'MOVE_EXERCISE'; planId: number, weekId: number; workoutId: number; dir: Dir, index: number }
  | { type: 'REORDER_EXERCISE'; planId: number, weekId: number; workoutId: number; fromIndex: number; toIndex: number }
  | { type: 'ADD_SET'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'REMOVE_SET'; planId: number, weekId: number; workoutId: number; exerciseId: number }
  | { type: 'UPDATE_WORKOUT_NAME'; planId: number, weekId: number; workoutId: number; name: string }
  | {
  type: 'UPDATE_SET_WEIGHT';
  planId: number,
  weekId: number;
  workoutId: number;
  exerciseId: number;
  setId: number;
  weight: number | null
}
  | {
  type: 'UPDATE_SET_REPS';
  planId: number,
  weekId: number;
  workoutId: number;
  exerciseId: number;
  setId: number;
  reps: number
}
  | {
  type: 'UPDATE_REP_RANGE';
  planId: number,
  weekId: number,
  workoutId: number,
  workoutExerciseId: number;
  repRange: string;
}
  | {
  type: 'UPDATE_REST_TIME';
  planId: number,
  weekId: number,
  workoutId: number,
  workoutExerciseId: number;
  restTime: string;
} | {
  type: 'UPDATE_SET_COUNT';
  planId: number,
  weekId: number,
  workoutId: number,
  workoutExerciseId: number;
  setCount: number;
}
  | {
  type: "UPDATE_CATEGORY";
  planId: number,
  weekId: number;
  workoutId: number;
  workoutExerciseId: number;
  category: string;
}
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
  | { type: 'REPLACE_PLAN'; planId: number; plan: PlanPrisma }
  | {
  type: 'UPDATE_CARDIO_DATA';
  planId: number;
  weekId: number;
  workoutId: number;
  exerciseId: number;
  field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance';
  value: number | null;
}

export type CreateUuid = () => number;

export function reducer(userDataState: UserPrisma, action: WorkoutEditorAction, createUuid: CreateUuid): UserPrisma {
  function getPlan(planId: number): PlanPrisma | undefined {
    return userDataState.plans.find(p => p.id === planId);
  }

  // Helper to DRY up devWarning checks
  function getOrWarn<T>(value: T | undefined, message: string): T | undefined {
    if (!value) {
      devWarning(message);
      return undefined;
    }
    return value;
  }

  /**
   * Retrieves a nested plan, week, workout, or exercise by IDs.
   * Returns the deepest object specified, or null if not found.
   */
  function getNestedOrWarn({
                             planId, weekId, workoutId, exerciseId, setId
  }: {
    planId: number; weekId?: number; workoutId?: number; exerciseId?: number, setId?: number
  }): PlanPrisma | WeekPrisma | WorkoutPrisma | WorkoutExercisePrisma | SetPrisma | null {
    const plan = getOrWarn(getPlan(planId),
      `Plan ${planId} does not exist`);
    if (!plan) return null;
    if (!weekId) return plan;
    const week = getOrWarn(plan.weeks.find(w => w.id === weekId),
      `Week ${weekId} does not exist in plan ${planId}`);
    if (!week) return null;
    if (!workoutId) return week;
    const workout = getOrWarn(week.workouts.find(wo => wo.id === workoutId),
      `Workout ${workoutId} does not exist in week ${weekId} (plan ${planId})`);
    if (!workout) return null;
    if (!exerciseId) return workout;
    const exercise = getOrWarn(workout.exercises.find(ex => ex.id === exerciseId),
      `Exercise ${exerciseId} does not exist in workout ${workoutId} (week ${weekId}, plan ${planId})`);
    if (!exercise) return null;
    if (!setId) return exercise
    const set = getOrWarn(exercise.sets.find(s => s.id === setId),
      `Set ${setId} does not exist in exercise ${exerciseId} (workout ${workoutId}, week ${weekId}, plan ${planId})`);
    if (!set) return null
    return set;
  }

  switch (action.type) {
    case 'UPDATE_PLAN_NAME': {
      const { planId, name } = action;
      const plan = getNestedOrWarn({planId});
      if (!plan) return userDataState;
      return userPlanMutators.updatePlanName(userDataState, planId, name);
    }

    case 'DUPLICATE_WEEK': {
      const { planId, weekId } = action;
      const weekToDuplicate = getNestedOrWarn({planId, weekId});
      if (!weekToDuplicate) return userDataState;
      return userPlanMutators.duplicateWeek(userDataState, planId, weekId, createUuid)
    }

    case 'DUPLICATE_WORKOUT': {
      const { planId, weekId, workoutId } = action;
      const workoutToDuplicate = getNestedOrWarn({planId, weekId, workoutId});
      if (!workoutToDuplicate) return userDataState;
      return userPlanMutators.duplicateWorkout(userDataState, planId, weekId, workoutId, createUuid)
    }

    case 'ADD_WEEK': {
      const { planId } = action;
      return userPlanMutators.addWeek(userDataState, planId, createUuid);
    }

    case 'REMOVE_WEEK': {
      const { planId, weekId } = action;
      const week = getNestedOrWarn({planId, weekId});
      if (!week) return userDataState;
      return userPlanMutators.removeWeek(userDataState, planId, weekId)
    }

    case 'ADD_WORKOUT': {
      const { planId, weekId } = action;
      const week = getNestedOrWarn({planId, weekId});
      if (!week) return userDataState;
      return userPlanMutators.addWorkout(userDataState, planId, weekId, createUuid)
    }

    case 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET': {
      const { planId, weekId } = action;
      const week = getNestedOrWarn({planId, weekId});
      if (!week) return userDataState;
      return userPlanMutators.addWorkoutWithExerciseWithSet(userDataState, planId, weekId, createUuid)
    }

    case 'REMOVE_WORKOUT': {
      const { planId, weekId, workoutId } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.removeWorkout(userDataState, planId, weekId, workoutId)
    }

    case 'ADD_EXERCISE': {
      const { planId, weekId, workoutId } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.addExercise(userDataState, planId, weekId, workoutId, createUuid)
    }

    case 'ADD_EXERCISE_WITH_SET': {
      const { planId, weekId, workoutId } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.addExerciseWithSet(userDataState, planId, weekId, workoutId, createUuid)
    }

    case 'MOVE_WORKOUT': {
      const { planId, weekId, dir, index } = action;
      const week = getNestedOrWarn({planId, weekId});
      if (!week) return userDataState;
      return userPlanMutators.moveWorkout(userDataState, planId, weekId, index, dir)
    }

    case 'REORDER_WORKOUT': {
      const { planId, weekId, fromIndex, toIndex } = action;
      const week = getNestedOrWarn({planId, weekId});
      if (!week) return userDataState;
      return userPlanMutators.reorderWorkout(userDataState, planId, weekId, fromIndex, toIndex)
    }

    case 'MOVE_EXERCISE': {
      const { planId, weekId, workoutId, dir, index } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.moveExercise(userDataState, planId, weekId, workoutId, index, dir)
    }

    case 'REORDER_EXERCISE': {
      const { planId, weekId, workoutId, fromIndex, toIndex } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.reorderExercise(userDataState, planId, weekId, workoutId, fromIndex, toIndex)
    }

    case 'REMOVE_EXERCISE': {
      const { planId, weekId, workoutId, exerciseId } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.removeExercise(userDataState, planId, weekId, workoutId, exerciseId)
    }

    case 'ADD_SET': {
      const { planId, weekId, workoutId, exerciseId } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.addSet(userDataState, planId, weekId, workoutId, exerciseId, createUuid)
    }

    case 'REMOVE_SET': {
      const { planId, weekId, workoutId, exerciseId } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId});
      if (!exercise) return userDataState;
      if (!('sets' in exercise) || !exercise.sets.length) {
        devWarning(`No sets to remove in exercise ${exerciseId} (workout ${workoutId}, week ${weekId}, plan ${planId})`);
        return userDataState;
      }
      return userPlanMutators.removeLastSet(userDataState, planId, weekId, workoutId, exerciseId)
    }

    case 'UPDATE_WORKOUT_NAME': {
      const { planId, weekId, workoutId, name } = action;
      const workout = getNestedOrWarn({planId, weekId, workoutId});
      if (!workout) return userDataState;
      return userPlanMutators.updateWorkoutName(userDataState, planId, weekId, workoutId, name)
    }

    case 'UPDATE_SET_WEIGHT': {
      const { planId, weekId, workoutId, exerciseId, setId, weight } = action;
      const set = getNestedOrWarn({planId, weekId, workoutId, exerciseId, setId});
      if (!set) return userDataState;
      return userPlanMutators.updateSetWeight(userDataState, planId, weekId, workoutId, exerciseId, setId, weight);
    }

    case 'UPDATE_SET_REPS': {
      const { planId, weekId, workoutId, exerciseId, setId, reps } = action;
      const set = getNestedOrWarn({planId, weekId, workoutId, exerciseId, setId});
      if (!set) return userDataState;
      return userPlanMutators.updateSetReps(userDataState, planId, weekId, workoutId, exerciseId, setId, reps);
    }

    case 'UPDATE_REP_RANGE': {
      const { planId, weekId, workoutId, workoutExerciseId, repRange } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId: workoutExerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateRepRange(userDataState, planId, weekId, workoutId, workoutExerciseId, repRange);
    }

    case 'UPDATE_REST_TIME': {
      const { planId, weekId, workoutId, workoutExerciseId, restTime } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId: workoutExerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateRestTime(userDataState, planId, weekId, workoutId, workoutExerciseId, restTime);
    }

    case 'UPDATE_SET_COUNT': {
      const { planId, weekId, workoutId, workoutExerciseId, setCount } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId: workoutExerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateSetCount(userDataState, planId, weekId, workoutId, workoutExerciseId, setCount, createUuid);
    }

    case "UPDATE_CATEGORY": {
      const { planId, weekId, workoutId, workoutExerciseId, category } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId: workoutExerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateCategory(userDataState, planId, weekId, workoutId, workoutExerciseId, category);
    }

    case "UPDATE_EXERCISE": {
      const { planId, weekId, workoutId, workoutExerciseId, exerciseName, exercises, category } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId: workoutExerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateExerciseInUser(userDataState, planId, weekId, workoutId, workoutExerciseId, exerciseName, exercises, category, createUuid)
    }

    case 'REPLACE_PLAN': {
      const { planId, plan } = action;
      return {
        ...userDataState,
        plans: userDataState.plans.map((p) => (p.id === planId ? plan : p)),
      };
    }

    case 'UPDATE_CARDIO_DATA': {
      const { planId, weekId, workoutId, exerciseId, field, value } = action;
      const exercise = getNestedOrWarn({planId, weekId, workoutId, exerciseId});
      if (!exercise) return userDataState;
      return userPlanMutators.updateCardioData(userDataState, planId, weekId, workoutId, exerciseId, field, value);
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