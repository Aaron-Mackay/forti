import { parseDashboardSettings, DEFAULT_SETTINGS } from './settingsTypes';

describe('parseDashboardSettings', () => {
  it('returns all defaults for null', () => {
    expect(parseDashboardSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns all defaults for undefined', () => {
    expect(parseDashboardSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns all defaults for empty object', () => {
    expect(parseDashboardSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('returns all defaults for non-object types', () => {
    expect(parseDashboardSettings('string')).toEqual(DEFAULT_SETTINGS);
    expect(parseDashboardSettings(42)).toEqual(DEFAULT_SETTINGS);
    expect(parseDashboardSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('applies a single override, leaving others as defaults', () => {
    const result = parseDashboardSettings({ showNextWorkout: false });
    expect(result.showNextWorkout).toBe(false);
    expect(result.showTodaysMetrics).toBe(true);
    expect(result.showWeeklyTraining).toBe(true);
    expect(result.showActiveBlock).toBe(true);
    expect(result.showUpcomingEvents).toBe(true);
    expect(result.showMetricsChart).toBe(true);
  });

  it('applies multiple overrides', () => {
    const result = parseDashboardSettings({
      showNextWorkout: false,
      showMetricsChart: false,
    });
    expect(result.showNextWorkout).toBe(false);
    expect(result.showMetricsChart).toBe(false);
    expect(result.showTodaysMetrics).toBe(true);
  });

  it('returns all false when all keys are explicitly false', () => {
    const allFalse = {
      showNextWorkout: false,
      showTodaysMetrics: false,
      showWeeklyTraining: false,
      showActiveBlock: false,
      showUpcomingEvents: false,
      showMetricsChart: false,
      showStopwatch: false,
    };
    expect(parseDashboardSettings(allFalse)).toEqual(allFalse);
  });
});
