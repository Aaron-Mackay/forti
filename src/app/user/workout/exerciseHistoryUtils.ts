import {computeE1rm} from '@/lib/e1rm';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';
import type {WorkoutExercisePrisma} from '@/types/dataTypes';

export function getTodayBestE1rm(exercise: WorkoutExercisePrisma): number | null {
  return exercise.sets
    .filter(set => !set.isDropSet)
    .reduce<number | null>((best, set) => {
      const e = computeE1rm(set.weight, set.reps);
      return e === null ? best : best === null ? e : Math.max(best, e);
    }, null);
}

export function getGroupBestE1rm(exercises: WorkoutExercisePrisma[]): number | null {
  return exercises
    .flatMap(ex => ex.sets)
    .filter(set => !set.isDropSet)
    .reduce<number | null>((best, set) => {
      const e = computeE1rm(set.weight, set.reps);
      return e === null ? best : best === null ? e : Math.max(best, e);
    }, null);
}

export function getHistoricalBest(history: E1rmHistoryPoint[] | null): number | null {
  if (!history || history.length === 0) return null;
  return Math.max(...history.map(p => p.bestE1rm));
}

export function getDisplayBest(todayBest: number | null, historicalBest: number | null): number | null {
  if (todayBest === null && historicalBest === null) return null;
  return Math.max(todayBest ?? 0, historicalBest ?? 0);
}

export function hasGraphableE1rmHistory(history: E1rmHistoryPoint[] | null): boolean {
  if (!history) return false;
  return history.filter(point => typeof point.bestE1rm === 'number').length > 1;
}

export function hasAnyE1rmHistory(history: E1rmHistoryPoint[] | null): boolean {
  return (history?.length ?? 0) > 0;
}
