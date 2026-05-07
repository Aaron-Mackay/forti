/**
 * Epley formula: e1rm = weight * (1 + reps / 30)
 * Returns null if either input is missing or weight or reps is not a valid number.
 */
export function computeE1rm(weight: number | null | undefined, reps: number | null | undefined): number | null {
  const MAX_REPS = 20
  if (!weight || !reps || reps > MAX_REPS) return null;
  return weight * (1 + reps / 30);
}
