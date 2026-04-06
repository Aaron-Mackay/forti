export type WeightUnit = 'kg' | 'lbs';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;

/** Convert a stored-kg value to the user's display unit. */
export function kgToDisplay(kg: number | null | undefined, unit: WeightUnit): number | null {
  if (kg == null) return null;
  if (unit === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10;
  return kg;
}

/** Convert a user-entered value (in their unit) back to kg for storage. */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? value * LBS_TO_KG : value;
}

/** Format a stored-kg value for display with unit suffix. Returns '—' for null. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  const v = kgToDisplay(kg, unit);
  if (v == null) return '—';
  // Show integer when clean, one decimal otherwise
  const display = v % 1 === 0 ? v.toString() : v.toFixed(1);
  return `${display} ${unit}`;
}
