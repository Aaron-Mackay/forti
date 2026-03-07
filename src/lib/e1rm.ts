/**
 * Epley formula: e1rm = weight * (1 + reps / 30)
 * Returns null if either input is missing or weight is not a valid number.
 */
export function computeE1rm(weight: string | null | undefined, reps: number | null | undefined): number | null {
  if (weight == null || reps == null) return null;
  const w = parseFloat(weight);
  if (isNaN(w)) return null;
  return w * (1 + reps / 30);
}
