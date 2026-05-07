import type { WeightUnit } from '@/lib/units';

export interface PlateCount {
  weight: number; // plate weight in the display unit
  count: number;
}

export interface PlateCalculation {
  platesPerSide: PlateCount[];
  /** True when the target cannot be hit exactly with the available plates */
  hasRemainder: boolean;
  /** The actual achievable weight (bar + plates), in kg */
  achievableKg: number;
}

// Standard plate sets keyed by unit
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5, 1.25];

const BAR_KG = 20;
const BAR_LBS = 45;

const KG_TO_LBS = 2.20462;

function barWeightInUnit(unit: WeightUnit): number {
  return unit === 'lbs' ? BAR_LBS : BAR_KG;
}

function platesForUnit(unit: WeightUnit): number[] {
  return unit === 'lbs' ? PLATES_LBS : PLATES_KG;
}

/**
 * Calculate the plates needed per side to load a barbell to `targetKg`.
 * All calculations are done in the display unit to keep plate weights intuitive.
 */
export function calculatePlates(targetKg: number, unit: WeightUnit): PlateCalculation {
  const target = unit === 'lbs' ? targetKg * KG_TO_LBS : targetKg;
  const bar = barWeightInUnit(unit);
  const plates = platesForUnit(unit);

  const perSideNeeded = (target - bar) / 2;

  if (perSideNeeded <= 0) {
    return {
      platesPerSide: [],
      hasRemainder: target !== bar,
      achievableKg: unit === 'lbs' ? bar / KG_TO_LBS : bar,
    };
  }

  let remaining = perSideNeeded;
  const result: PlateCount[] = [];

  for (const plate of plates) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ weight: plate, count });
      remaining -= plate * count;
      remaining = Math.round(remaining * 1000) / 1000; // float noise guard
    }
  }

  const loadedPerSide = result.reduce((sum, p) => sum + p.weight * p.count, 0);
  const achievableDisplay = bar + loadedPerSide * 2;
  const achievableKg = unit === 'lbs' ? achievableDisplay / KG_TO_LBS : achievableDisplay;

  return {
    platesPerSide: result,
    hasRemainder: remaining > 0.01,
    achievableKg,
  };
}

export { barWeightInUnit, platesForUnit, BAR_KG, BAR_LBS };
