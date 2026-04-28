export type WeightUnit = 'kg' | 'lbs';
export type BodyweightUnit = 'kg' | 'lb' | 'st';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const KG_TO_ST = 0.157473;
const ST_TO_KG = 1 / KG_TO_ST;

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

/** Convert a stored-kg bodyweight value to the user's display unit. */
export function kgToBodyweightDisplay(kg: number | null | undefined, unit: BodyweightUnit): number | null {
  if (kg == null) return null;
  if (unit === 'lb') return Math.round(kg * KG_TO_LBS * 10) / 10;
  if (unit === 'st') return Math.round(kg * KG_TO_ST * 10) / 10;
  return kg;
}

/** Convert a user-entered bodyweight value (in their unit) back to kg for storage. */
export function bodyweightDisplayToKg(value: number, unit: BodyweightUnit): number {
  if (unit === 'lb') return value * LBS_TO_KG;
  if (unit === 'st') return value * ST_TO_KG;
  return value;
}

/** Format a stored-kg bodyweight value for display with unit suffix. Returns '—' for null. */
export function formatBodyweight(kg: number | null | undefined, unit: BodyweightUnit): string {
  const v = kgToBodyweightDisplay(kg, unit);
  if (v == null) return '—';
  const display = v % 1 === 0 ? v.toString() : v.toFixed(1);
  return `${display} ${unit}`;
}
