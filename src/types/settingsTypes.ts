export interface CustomMetricDef {
  id: string;   // UUID, stable — never changes even if name is renamed
  name: string; // user-defined label
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
  // Up to 5 user-defined metric slots
  customMetrics: CustomMetricDef[];
  // Onboarding state
  onboardingDismissed: boolean;
  onboardingSeenWelcome: boolean;
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
      result.push({ id: item.id, name: item.name });
    }
  }
  return result.slice(0, 5);
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
  };
}
