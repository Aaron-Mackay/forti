import { parseDashboardSettings, DEFAULT_SETTINGS } from './settingsTypes';

describe('parseDashboardSettings', () => {
  it('returns all defaults for null', () => {
    expect(parseDashboardSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns all defaults for undefined', () => {
    expect(parseDashboardSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns all defaults for empty object, except registrationComplete which defaults to true for existing users', () => {
    expect(parseDashboardSettings({})).toEqual({ ...DEFAULT_SETTINGS, registrationComplete: true });
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
      exerciseUnitOverrides: {},
      trackedE1rmExercises: [],
      showE1rmProgress: false,
      registrationComplete: false,
      effortMetric: 'none' as const,
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

  describe('exerciseUnitOverrides parsing', () => {
    it('defaults to empty object when absent', () => {
      expect(parseDashboardSettings({}).exerciseUnitOverrides).toEqual({});
    });

    it('parses valid overrides', () => {
      const raw = { exerciseUnitOverrides: { '1': 'none', '2': 'lbs', '3': 'kg' } };
      expect(parseDashboardSettings(raw).exerciseUnitOverrides).toEqual({ '1': 'none', '2': 'lbs', '3': 'kg' });
    });

    it('strips invalid values', () => {
      const raw = { exerciseUnitOverrides: { '1': 'none', '2': 'stones', '3': 42, '4': null } };
      expect(parseDashboardSettings(raw).exerciseUnitOverrides).toEqual({ '1': 'none' });
    });

    it('returns empty object for non-object input', () => {
      expect(parseDashboardSettings({ exerciseUnitOverrides: 'bad' }).exerciseUnitOverrides).toEqual({});
      expect(parseDashboardSettings({ exerciseUnitOverrides: [] }).exerciseUnitOverrides).toEqual({});
      expect(parseDashboardSettings({ exerciseUnitOverrides: null }).exerciseUnitOverrides).toEqual({});
    });
  });

  describe('trackedE1rmExercises parsing', () => {
    it('defaults to empty array when absent', () => {
      expect(parseDashboardSettings({}).trackedE1rmExercises).toEqual([]);
    });

    it('parses valid tracked exercises', () => {
      const exercises = [
        { id: 1, name: 'Squat' },
        { id: 2, name: 'Bench Press' },
      ];
      expect(parseDashboardSettings({ trackedE1rmExercises: exercises }).trackedE1rmExercises).toEqual(exercises);
    });

    it('strips entries with missing or invalid id/name', () => {
      const raw = [
        { id: 1, name: 'Valid' },
        { name: 'No id' },
        { id: 2 },
        { id: 0, name: 'Zero id' },
        { id: -1, name: 'Negative id' },
        null,
        42,
      ];
      expect(parseDashboardSettings({ trackedE1rmExercises: raw }).trackedE1rmExercises).toEqual([
        { id: 1, name: 'Valid' },
      ]);
    });

    it('deduplicates by id', () => {
      const raw = [
        { id: 1, name: 'First' },
        { id: 1, name: 'Duplicate' },
      ];
      expect(parseDashboardSettings({ trackedE1rmExercises: raw }).trackedE1rmExercises).toEqual([
        { id: 1, name: 'First' },
      ]);
    });

    it('caps at 5 entries', () => {
      const raw = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Exercise ${i + 1}` }));
      expect(parseDashboardSettings({ trackedE1rmExercises: raw }).trackedE1rmExercises).toHaveLength(5);
    });

    it('returns empty array for non-array input', () => {
      expect(parseDashboardSettings({ trackedE1rmExercises: 'bad' }).trackedE1rmExercises).toEqual([]);
      expect(parseDashboardSettings({ trackedE1rmExercises: {} }).trackedE1rmExercises).toEqual([]);
      expect(parseDashboardSettings({ trackedE1rmExercises: null }).trackedE1rmExercises).toEqual([]);
    });
  });

  describe('registrationComplete parsing', () => {
    it('defaults to false for null (brand-new account)', () => {
      expect(parseDashboardSettings(null).registrationComplete).toBe(false);
    });

    it('defaults to true when absent from a non-null settings object (existing user)', () => {
      expect(parseDashboardSettings({}).registrationComplete).toBe(true);
      expect(parseDashboardSettings({ showNextWorkout: false }).registrationComplete).toBe(true);
    });

    it('parses explicit true and false correctly', () => {
      expect(parseDashboardSettings({ registrationComplete: true }).registrationComplete).toBe(true);
      expect(parseDashboardSettings({ registrationComplete: false }).registrationComplete).toBe(false);
    });

    it('defaults to true for non-boolean values in an object', () => {
      expect(parseDashboardSettings({ registrationComplete: 1 }).registrationComplete).toBe(true);
      expect(parseDashboardSettings({ registrationComplete: 'yes' }).registrationComplete).toBe(true);
    });
  });

  describe('effortMetric parsing', () => {
    it('defaults to none when absent', () => {
      expect(parseDashboardSettings({}).effortMetric).toBe('none');
    });

    it('parses rpe and rir correctly', () => {
      expect(parseDashboardSettings({ effortMetric: 'rpe' }).effortMetric).toBe('rpe');
      expect(parseDashboardSettings({ effortMetric: 'rir' }).effortMetric).toBe('rir');
    });

    it('defaults to none for invalid values', () => {
      expect(parseDashboardSettings({ effortMetric: 'both' }).effortMetric).toBe('none');
      expect(parseDashboardSettings({ effortMetric: 42 }).effortMetric).toBe('none');
      expect(parseDashboardSettings({ effortMetric: null }).effortMetric).toBe('none');
    });
  });

  describe('showE1rmProgress parsing', () => {
    it('defaults to true when absent', () => {
      expect(parseDashboardSettings({}).showE1rmProgress).toBe(true);
    });

    it('parses false correctly', () => {
      expect(parseDashboardSettings({ showE1rmProgress: false }).showE1rmProgress).toBe(false);
    });

    it('defaults to true for non-boolean values', () => {
      expect(parseDashboardSettings({ showE1rmProgress: 'yes' }).showE1rmProgress).toBe(true);
      expect(parseDashboardSettings({ showE1rmProgress: 1 }).showE1rmProgress).toBe(true);
    });
  });

  describe('customMetrics parsing', () => {
    it('returns empty array when customMetrics is absent', () => {
      expect(parseDashboardSettings({}).customMetrics).toEqual([]);
    });

    it('parses valid custom metric definitions', () => {
      const defs = [
        { id: 'abc-1', name: 'Thigh', target: null },
        { id: 'abc-2', name: 'Waist', target: null },
      ];
      expect(parseDashboardSettings({ customMetrics: defs }).customMetrics).toEqual(defs);
    });

    it('parses target when present', () => {
      const raw = [{ id: 'abc-1', name: 'Waist', target: 85 }];
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toEqual([
        { id: 'abc-1', name: 'Waist', target: 85 },
      ]);
    });

    it('defaults target to null when absent or invalid', () => {
      const raw = [
        { id: 'abc-1', name: 'Waist' },
        { id: 'abc-2', name: 'Other', target: 'not-a-number' },
      ];
      const result = parseDashboardSettings({ customMetrics: raw }).customMetrics;
      expect(result[0].target).toBeNull();
      expect(result[1].target).toBeNull();
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
        { id: 'abc-1', name: 'Valid', target: null },
      ]);
    });

    it('deduplicates by id', () => {
      const raw = [
        { id: 'dup', name: 'First' },
        { id: 'dup', name: 'Second' },
      ];
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toEqual([
        { id: 'dup', name: 'First', target: null },
      ]);
    });

    it('caps at 4 entries', () => {
      const raw = Array.from({ length: 6 }, (_, i) => ({ id: `id-${i}`, name: `Metric ${i}` }));
      expect(parseDashboardSettings({ customMetrics: raw }).customMetrics).toHaveLength(4);
    });

    it('returns empty array when customMetrics is not an array', () => {
      expect(parseDashboardSettings({ customMetrics: 'bad' }).customMetrics).toEqual([]);
      expect(parseDashboardSettings({ customMetrics: {} }).customMetrics).toEqual([]);
      expect(parseDashboardSettings({ customMetrics: null }).customMetrics).toEqual([]);
    });
  });
});
