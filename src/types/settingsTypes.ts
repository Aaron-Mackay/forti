import type { WeightUnit } from '@/lib/units';
export type { WeightUnit };

/** Per-exercise unit override stored in settings. */
export type ExerciseUnitOverride = 'kg' | 'lbs' | 'none';

export interface CustomMetricDef {
  id: string;   // UUID, stable — never changes even if name is renamed
  name: string; // user-defined label
  target?: number | null; // global target shown in daily metric display
}

/** An exercise selected for e1rm progress tracking on the dashboard. */
export interface TrackedE1rmExercise {
  id: number;
  name: string;
}

export interface Settings {
  showNextWorkout: boolean;
  showTodaysMetrics: boolean;
  showWeeklyTraining: boolean;
  showActiveBlock: boolean;
  showUpcomingEvents: boolean;
  showMetricsChart: boolean;
  showStopwatch: boolean;
  coachModeActive: boolean;
  showSupplements: boolean;
  // 0 = Monday … 6 = Sunday
  checkInDay: number;
  // Up to 4 user-defined metric slots
  customMetrics: CustomMetricDef[];
  // Onboarding state
  onboardingDismissed: boolean;
  onboardingSeenWelcome: boolean;
  // Unit preference — all weights stored in kg, converted on display
  weightUnit: WeightUnit;
  // Per-exercise overrides: key = exerciseId as string, value = unit or 'none'
  exerciseUnitOverrides: Record<string, ExerciseUnitOverride>;
  // Up to 5 exercises whose e1rm progress is shown on the dashboard
  trackedE1rmExercises: TrackedE1rmExercise[];
  showE1rmProgress: boolean;
  // Set to false for brand-new accounts; true once onboarding wizard is completed
  registrationComplete: boolean;
  // Per-set effort metric shown in the workout view. 'none' = disabled (default).
  effortMetric: 'none' | 'rpe' | 'rir';
}

export const DEFAULT_SETTINGS: Settings = {
  showNextWorkout: true,
  showTodaysMetrics: true,
  showWeeklyTraining: true,
  showActiveBlock: true,
  showUpcomingEvents: true,
  showMetricsChart: true,
  showStopwatch: true,
  coachModeActive: false,
  showSupplements: false,
  checkInDay: 0,
  customMetrics: [],
  onboardingDismissed: false,
  onboardingSeenWelcome: false,
  weightUnit: 'kg',
  exerciseUnitOverrides: {},
  trackedE1rmExercises: [],
  showE1rmProgress: true,
  registrationComplete: false,
  effortMetric: 'none',
};

function parseCustomMetrics(raw: unknown): CustomMetricDef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: CustomMetricDef[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.name === 'string' &&
      !seen.has(item.id)
    ) {
      seen.add(item.id);
      result.push({ id: item.id, name: item.name, target: typeof item.target === 'number' ? item.target : null });
    }
  }
  return result.slice(0, 4);
}

function parseTrackedE1rmExercises(raw: unknown): TrackedE1rmExercise[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const result: TrackedE1rmExercise[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'number' &&
      item.id > 0 &&
      typeof item.name === 'string' &&
      item.name.length > 0 &&
      !seen.has(item.id)
    ) {
      seen.add(item.id);
      result.push({ id: item.id, name: item.name });
    }
  }
  return result.slice(0, 5);
}

const VALID_OVERRIDES = new Set<string>(['kg', 'lbs', 'none']);

function parseExerciseUnitOverrides(raw: unknown): Record<string, ExerciseUnitOverride> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, ExerciseUnitOverride> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && VALID_OVERRIDES.has(v)) {
      result[k] = v as ExerciseUnitOverride;
    }
  }
  return result;
}

export function parseDashboardSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }
  const s = raw as Record<string, unknown>;
  return {
    showNextWorkout:    typeof s.showNextWorkout    === 'boolean' ? s.showNextWorkout    : true,
    showTodaysMetrics:  typeof s.showTodaysMetrics  === 'boolean' ? s.showTodaysMetrics  : true,
    showWeeklyTraining: typeof s.showWeeklyTraining === 'boolean' ? s.showWeeklyTraining : true,
    showActiveBlock:    typeof s.showActiveBlock    === 'boolean' ? s.showActiveBlock    : true,
    showUpcomingEvents: typeof s.showUpcomingEvents === 'boolean' ? s.showUpcomingEvents : true,
    showMetricsChart:   typeof s.showMetricsChart   === 'boolean' ? s.showMetricsChart   : true,
    showStopwatch:      typeof s.showStopwatch      === 'boolean' ? s.showStopwatch      : true,
    coachModeActive:    typeof s.coachModeActive    === 'boolean' ? s.coachModeActive    : false,
    showSupplements:    typeof s.showSupplements    === 'boolean' ? s.showSupplements    : false,
    checkInDay:              typeof s.checkInDay              === 'number'  ? s.checkInDay              : 0,
    customMetrics:           parseCustomMetrics(s.customMetrics),
    onboardingDismissed:     typeof s.onboardingDismissed     === 'boolean' ? s.onboardingDismissed     : false,
    onboardingSeenWelcome:   typeof s.onboardingSeenWelcome   === 'boolean' ? s.onboardingSeenWelcome   : false,
    weightUnit:              s.weightUnit === 'lbs' ? 'lbs' : 'kg',
    exerciseUnitOverrides:   parseExerciseUnitOverrides(s.exerciseUnitOverrides),
    trackedE1rmExercises:    parseTrackedE1rmExercises(s.trackedE1rmExercises),
    showE1rmProgress:        typeof s.showE1rmProgress === 'boolean' ? s.showE1rmProgress : true,
    // Absent means existing user (pre-onboarding feature) — treat as complete
    registrationComplete:    typeof s.registrationComplete === 'boolean' ? s.registrationComplete : true,
    effortMetric:            (s.effortMetric === 'rpe' || s.effortMetric === 'rir') ? s.effortMetric : 'none',
  };
}
