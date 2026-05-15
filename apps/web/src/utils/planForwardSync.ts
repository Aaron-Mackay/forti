import { PlanPrisma, WorkoutExercisePrisma, WorkoutPrisma } from '@/types/dataTypes';
import { WorkoutEditorAction } from '@lib/useWorkoutEditor';

function findFutureMatch(
  futureWeeks: PlanPrisma['weeks'],
  sourceWorkout: WorkoutPrisma,
  sourceEx: WorkoutExercisePrisma,
): Array<{ weekId: number; workout: WorkoutPrisma; ex: WorkoutExercisePrisma }> {
  const results: Array<{ weekId: number; workout: WorkoutPrisma; ex: WorkoutExercisePrisma }> = [];
  for (const week of futureWeeks) {
    const workout = week.workouts.find(w => w.name === sourceWorkout.name);
    if (!workout) continue;
    const ex = workout.exercises.find(e => e.exerciseId === sourceEx.exerciseId);
    if (!ex) continue;
    results.push({ weekId: week.id, workout, ex });
  }
  return results;
}

/**
 * Returns additional actions to propagate a dispatched action to all future weeks.
 *
 * "Future weeks" = weeks whose order is higher than the week targeted by the action.
 * Workout matching is by name; exercise matching is by Exercise.exerciseId (the global exercise FK).
 *
 * Returns an empty array for actions that are not synced (weight/reps, week-level ops)
 * or when no future weeks are matched.
 */
export function computeForwardSyncActions(
  plan: PlanPrisma,
  action: WorkoutEditorAction,
): WorkoutEditorAction[] {
  if (!('weekId' in action)) return [];
  const weekId = (action as { weekId: number }).weekId;

  const sourceWeek = plan.weeks.find(w => w.id === weekId);
  if (!sourceWeek) return [];

  const futureWeeks = plan.weeks.filter(w => w.order > sourceWeek.order);
  if (futureWeeks.length === 0) return [];

  const results: WorkoutEditorAction[] = [];

  switch (action.type) {
    case 'UPDATE_REP_RANGE':
    case 'UPDATE_REST_TIME':
    case 'UPDATE_TARGET_EFFORT':
    case 'UPDATE_SET_COUNT': {
      // These use workoutExerciseId (= WorkoutExercise.id)
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;
      const sourceEx = sourceWorkout.exercises.find(e => e.id === action.workoutExerciseId);
      if (!sourceEx) break;

      for (const { weekId: fwId, workout, ex } of findFutureMatch(futureWeeks, sourceWorkout, sourceEx)) {
        results.push({ ...action, weekId: fwId, workoutId: workout.id, workoutExerciseId: ex.id });
      }
      break;
    }

    case 'ADD_SET':
    case 'REMOVE_SET': {
      // These use exerciseId (= WorkoutExercise.id)
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;
      const sourceEx = sourceWorkout.exercises.find(e => e.id === action.exerciseId);
      if (!sourceEx) break;

      for (const { weekId: fwId, workout, ex } of findFutureMatch(futureWeeks, sourceWorkout, sourceEx)) {
        results.push({ ...action, weekId: fwId, workoutId: workout.id, exerciseId: ex.id });
      }
      break;
    }

    case 'UPDATE_EXERCISE': {
      // workoutExerciseId = WorkoutExercise.id; we match by the current exerciseId FK
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;
      const sourceEx = sourceWorkout.exercises.find(e => e.id === action.workoutExerciseId);
      if (!sourceEx) break;

      for (const { weekId: fwId, workout, ex } of findFutureMatch(futureWeeks, sourceWorkout, sourceEx)) {
        results.push({ ...action, weekId: fwId, workoutId: workout.id, workoutExerciseId: ex.id });
      }
      break;
    }

    case 'REMOVE_EXERCISE': {
      // exerciseId = WorkoutExercise.id
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;
      const sourceEx = sourceWorkout.exercises.find(e => e.id === action.exerciseId);
      if (!sourceEx) break;

      for (const { weekId: fwId, workout, ex } of findFutureMatch(futureWeeks, sourceWorkout, sourceEx)) {
        results.push({
          type: 'REMOVE_EXERCISE',
          planId: action.planId,
          weekId: fwId,
          workoutId: workout.id,
          exerciseId: ex.id,
        });
      }
      break;
    }

    case 'REORDER_EXERCISE': {
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;

      for (const week of futureWeeks) {
        const workout = week.workouts.find(w => w.name === sourceWorkout.name);
        if (!workout) continue;
        if (workout.exercises.length <= Math.max(action.fromIndex, action.toIndex)) continue;

        results.push({
          type: 'REORDER_EXERCISE',
          planId: action.planId,
          weekId: week.id,
          workoutId: workout.id,
          fromIndex: action.fromIndex,
          toIndex: action.toIndex,
        });
      }
      break;
    }

    case 'ADD_EXERCISE':
    case 'ADD_EXERCISE_WITH_SET':
    case 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE': {
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;

      for (const week of futureWeeks) {
        const workout = week.workouts.find(w => w.name === sourceWorkout.name);
        if (!workout) continue;
        results.push({ ...action, weekId: week.id, workoutId: workout.id } as WorkoutEditorAction);
      }
      break;
    }

    case 'REMOVE_WORKOUT': {
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;

      for (const week of futureWeeks) {
        const workout = week.workouts.find(w => w.name === sourceWorkout.name);
        if (!workout) continue;
        results.push({ type: 'REMOVE_WORKOUT', planId: action.planId, weekId: week.id, workoutId: workout.id });
      }
      break;
    }

    case 'ADD_WORKOUT':
    case 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET': {
      for (const week of futureWeeks) {
        results.push({ type: action.type, planId: action.planId, weekId: week.id });
      }
      break;
    }

    case 'UPDATE_WORKOUT_NAME': {
      const sourceWorkout = sourceWeek.workouts.find(w => w.id === action.workoutId);
      if (!sourceWorkout) break;
      const oldName = sourceWorkout.name;

      for (const week of futureWeeks) {
        const workout = week.workouts.find(w => w.name === oldName);
        if (!workout) continue;
        results.push({ type: 'UPDATE_WORKOUT_NAME', planId: action.planId, weekId: week.id, workoutId: workout.id, name: action.name });
      }
      break;
    }

    case 'MOVE_WORKOUT': {
      // action.index = position of workout being moved in source week (sorted by order)
      const sorted = [...sourceWeek.workouts].sort((a, b) => a.order - b.order);
      const sourceWorkout = sorted[action.index];
      if (!sourceWorkout) break;

      for (const week of futureWeeks) {
        const sortedFuture = [...week.workouts].sort((a, b) => a.order - b.order);
        const futureIdx = sortedFuture.findIndex(w => w.name === sourceWorkout.name);
        if (futureIdx === -1) continue;
        results.push({ type: 'MOVE_WORKOUT', planId: action.planId, weekId: week.id, dir: action.dir, index: futureIdx });
      }
      break;
    }

    case 'REORDER_WORKOUT': {
      const sorted = [...sourceWeek.workouts].sort((a, b) => a.order - b.order);
      const sourceWorkout = sorted[action.fromIndex];
      if (!sourceWorkout) break;

      for (const week of futureWeeks) {
        const sortedFuture = [...week.workouts].sort((a, b) => a.order - b.order);
        const fromIdx = sortedFuture.findIndex(w => w.name === sourceWorkout.name);
        if (fromIdx === -1) continue;
        const toIdx = Math.min(action.toIndex, sortedFuture.length - 1);
        results.push({ type: 'REORDER_WORKOUT', planId: action.planId, weekId: week.id, fromIndex: fromIdx, toIndex: toIdx });
      }
      break;
    }

    default:
      break;
  }

  return results;
}

/** Returns the count of unique future weekIds in a set of sync actions. */
export function countSyncedWeeks(actions: WorkoutEditorAction[]): number {
  const ids = new Set<number>();
  for (const a of actions) {
    if ('weekId' in a) ids.add((a as { weekId: number }).weekId);
  }
  return ids.size;
}
