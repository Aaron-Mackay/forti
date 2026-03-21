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
      coachModeActive: false,
      showSupplements: false,
      checkInDay: 0,
      customMetrics: [],
      onboardingDismissed: false,
      onboardingSeenWelcome: false,
      weightUnit: 'kg' as const,
    };
    expect(parseDashboardSettings(allFalse)).toEqual(allFalse);
  });

  it('defaults weightUnit to kg when absent', () => {
    expect(parseDashboardSettings({}).weightUnit).toBe('kg');
  });

  it('parses weightUnit lbs', () => {
    expect(parseDashboardSettings({ weightUnit: 'lbs' }).weightUnit).toBe('lbs');
  });

  it('defaults weightUnit to kg for invalid values', () => {
    expect(parseDashboardSettings({ weightUnit: 'stones' }).weightUnit).toBe('kg');
    expect(parseDashboardSettings({ weightUnit: 42 }).weightUnit).toBe('kg');
  });

  it('parses onboardingDismissed and onboardingSeenWelcome', () => {
    const result = parseDashboardSettings({ onboardingDismissed: true, onboardingSeenWelcome: true });
    expect(result.onboardingDismissed).toBe(true);
    expect(result.onboardingSeenWelcome).toBe(true);
  });

  it('defaults onboarding flags to false when absent', () => {
    const result = parseDashboardSettings({});
    expect(result.onboardingDismissed).toBe(false);
    expect(result.onboardingSeenWelcome).toBe(false);
  });

  describe('customMetrics parsing', () => {
    it('returns empty array when customMetrics is absent', () => {
      expect(parseDashboardSettings({}).customMetrics).toEqual([]);
    });

    it('parses valid custom metric definitions', () => {
      const defs = [
        { id: 'abc-1', name: 'Thigh' },
        { id: 'abc-2', name: 'Waist' },
      ];
      expect(parseDashboardSettings({ customMetrics: defs }).customMetrics).toEqual(defs);
    });

    it('strips entries with missing id or name', () => {
      const raw = [
        { id: 'abc-1', name: 'Valid' },
        { name: 'No id' },
        { id: 'abc-2' },
        null,
        42,
      ];
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toEqual([
        { id: 'abc-1', name: 'Valid' },
      ]);
    });

    it('deduplicates by id', () => {
      const raw = [
        { id: 'dup', name: 'First' },
        { id: 'dup', name: 'Second' },
      ];
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toEqual([
        { id: 'dup', name: 'First' },
      ]);
    });

    it('caps at 5 entries', () => {
      const raw = Array.from({ length: 7 }, (_, i) => ({ id: `id-${i}`, name: `Metric ${i}` }));
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toHaveLength(5);
    });

    it('returns empty array when customMetrics is not an array', () => {
      expect(parseDashboardSettings({ customMetrics: 'bad' }).customMetrics).toEqual([]);
      expect(parseDashboardSettings({ customMetrics: {} }).customMetrics).toEqual([]);
      expect(parseDashboardSettings({ customMetrics: null }).customMetrics).toEqual([]);
    });
  });
});
