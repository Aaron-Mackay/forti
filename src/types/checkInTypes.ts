import type { Metric, WeeklyCheckIn } from '@/generated/prisma/browser';

export type { WeeklyCheckIn };

export interface CheckInWithUser extends WeeklyCheckIn {
  user: { id: string; name: string };
}

export interface PreviousPhotos {
  frontPhotoUrl: string | null;
  backPhotoUrl: string | null;
  sidePhotoUrl: string | null;
}

export interface WeekTargets {
  stepsTarget: number | null;
  sleepMinsTarget: number | null;
  caloriesTarget: number | null;
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
}

export interface CurrentCheckInResponse {
  checkIn: WeeklyCheckIn;
  currentWeek: Metric[];
  weekPrior: Metric[];
  previousPhotos: PreviousPhotos | null;
  weekTargets: WeekTargets | null;
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  activePlanId: number | null;
}

export interface MetricSummary {
  avgWeight: number | null;
  avgSteps: number | null;
  avgSleepMins: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
}

export const CHECK_IN_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function computeMetricSummary(metrics: Metric[]): MetricSummary {
  function avg(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null);
    return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
  }
  return {
    avgWeight:    avg(metrics.map(m => m.weight)),
    avgSteps:     avg(metrics.map(m => m.steps)),
    avgSleepMins: avg(metrics.map(m => m.sleepMins)),
    avgCalories:  avg(metrics.map(m => m.calories)),
    avgProtein:   avg(metrics.map(m => m.protein)),
    avgCarbs:     avg(metrics.map(m => m.carbs)),
    avgFat:       avg(metrics.map(m => m.fat)),
  };
}

export function formatSleepMins(mins: number | null): string {
  if (mins === null) return '—';
  const whole = Math.round(mins);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
