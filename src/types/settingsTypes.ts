export interface DashboardSettings {
  showNextWorkout: boolean;
  showTodaysMetrics: boolean;
  showWeeklyTraining: boolean;
  showActiveBlock: boolean;
  showUpcomingEvents: boolean;
  showMetricsChart: boolean;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  showNextWorkout: true,
  showTodaysMetrics: true,
  showWeeklyTraining: true,
  showActiveBlock: true,
  showUpcomingEvents: true,
  showMetricsChart: true,
};

export function parseDashboardSettings(raw: unknown): DashboardSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_DASHBOARD_SETTINGS };
  }
  const s = raw as Partial<DashboardSettings>;
  return {
    showNextWorkout:    s.showNextWorkout    ?? true,
    showTodaysMetrics:  s.showTodaysMetrics  ?? true,
    showWeeklyTraining: s.showWeeklyTraining ?? true,
    showActiveBlock:    s.showActiveBlock    ?? true,
    showUpcomingEvents: s.showUpcomingEvents ?? true,
    showMetricsChart:   s.showMetricsChart   ?? true,
  };
}
