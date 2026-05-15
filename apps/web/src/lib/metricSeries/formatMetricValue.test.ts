import { describe, expect, it } from 'vitest';
import { getMetricFormatter } from './formatMetricValue';
import { DEFAULT_SETTINGS, type Settings } from '@/types/settingsTypes';

const settings: Settings = { ...DEFAULT_SETTINGS };

describe('getMetricFormatter', () => {
  it('formats weight with the user bodyweight unit', () => {
    const fmt = getMetricFormatter('weight', settings);
    expect(fmt.full(84.2)).toBe('84.2 kg');
    expect(fmt.delta(-0.3)).toBe('−0.3 kg');
    expect(fmt.delta(0)).toBe('hold');
    expect(fmt.delta(0.5)).toBe('+0.5 kg');
  });

  it('honours lb bodyweight setting', () => {
    const lbSettings: Settings = { ...settings, bodyweightUnit: 'lb' };
    const fmt = getMetricFormatter('weight', lbSettings);
    expect(fmt.full(186)).toBe('186 lb');
    expect(fmt.unitHint).toBe('lb');
  });

  it('formats sleep minutes as Xh YYm', () => {
    const fmt = getMetricFormatter('sleepMins', settings);
    expect(fmt.full(450)).toBe('7h 30m');
    expect(fmt.delta(12)).toBe('+12m');
    expect(fmt.delta(0)).toBe('hold');
  });

  it('formats a rating-shaped custom metric (target=5)', () => {
    const fmt = getMetricFormatter('energy', settings, {
      id: 'energy',
      name: 'Energy',
      target: 5,
    });
    expect(fmt.full(4)).toBe('4 / 5');
    expect(fmt.delta(-1)).toBe('−1');
    expect(fmt.delta(0)).toBe('hold');
  });

  it('falls back to plain numeric for customs without a small target', () => {
    const fmt = getMetricFormatter('rhr', settings, {
      id: 'rhr',
      name: 'Resting HR',
      target: null,
    });
    expect(fmt.full(58)).toBe('58');
    expect(fmt.delta(-2)).toBe('−2');
  });
});
