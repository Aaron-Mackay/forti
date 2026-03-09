import { WorkoutPrisma, WeekPrisma, PlanPrisma } from '@/types/dataTypes';

export type ProgressStatus = 'completed' | 'in_progress' | 'untouched';

export function getWorkoutStatus(workout: WorkoutPrisma): ProgressStatus {
  if (workout.dateCompleted) return 'completed';
  const hasStartedSets = workout.exercises.some(ex =>
    ex.sets.some(s => s.reps !== null && s.reps > 0)
  );
  return hasStartedSets ? 'in_progress' : 'untouched';
}

export function getWeekStatus(week: WeekPrisma): ProgressStatus {
  if (week.workouts.length === 0) return 'untouched';
  const statuses = week.workouts.map(getWorkoutStatus);
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s !== 'untouched')) return 'in_progress';
  return 'untouched';
}

export function getPlanStatus(plan: PlanPrisma): ProgressStatus {
  if (plan.weeks.length === 0) return 'untouched';
  const statuses = plan.weeks.map(getWeekStatus);
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s !== 'untouched')) return 'in_progress';
  return 'untouched';
}
