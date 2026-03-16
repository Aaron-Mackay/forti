export interface Settings {
  showNextWorkout: boolean;
  showTodaysMetrics: boolean;
  showWeeklyTraining: boolean;
  showActiveBlock: boolean;
  showUpcomingEvents: boolean;
  showMetricsChart: boolean;
  showStopwatch: boolean;
  coachModeActive: boolean;
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
};

export function parseDashboardSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }
  const s = raw as Partial<Settings>;
  return {
    showNextWorkout:    s.showNextWorkout    ?? true,
    showTodaysMetrics:  s.showTodaysMetrics  ?? true,
    showWeeklyTraining: s.showWeeklyTraining ?? true,
    showActiveBlock:    s.showActiveBlock    ?? true,
    showUpcomingEvents: s.showUpcomingEvents ?? true,
    showMetricsChart:   s.showMetricsChart   ?? true,
    showStopwatch:      s.showStopwatch      ?? true,
    coachModeActive:    s.coachModeActive    ?? false,
  };
}
