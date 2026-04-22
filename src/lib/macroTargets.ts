export type MacroPercentValues = {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export type MacroGramValues = {
  protein: number;
  carbs: number;
  fat: number;
};

const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

function sanitizeNumber(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeToHundred(raw: { proteinPct: number; carbsPct: number; fatPct: number }): MacroPercentValues {
  const protein = sanitizeNumber(raw.proteinPct);
  const carbs = sanitizeNumber(raw.carbsPct);
  const fat = sanitizeNumber(raw.fatPct);
  const total = protein + carbs + fat;
  if (total <= 0) return { proteinPct: 0, carbsPct: 0, fatPct: 0 };

  const scaled = [
    { key: 'proteinPct' as const, value: (protein / total) * 100 },
    { key: 'carbsPct' as const, value: (carbs / total) * 100 },
    { key: 'fatPct' as const, value: (fat / total) * 100 },
  ];

  const floorValues = scaled.map(item => Math.floor(item.value));
  let remainder = 100 - floorValues.reduce((sum, value) => sum + value, 0);

  const withFraction = scaled
    .map((item, index) => ({ index, frac: item.value - floorValues[index] }))
    .sort((a, b) => b.frac - a.frac);

  while (remainder > 0) {
    const target = withFraction.shift();
    if (!target) break;
    floorValues[target.index] += 1;
    remainder -= 1;
  }

  return {
    proteinPct: floorValues[0],
    carbsPct: floorValues[1],
    fatPct: floorValues[2],
  };
}

export function sumMacroPercents(values: Partial<MacroPercentValues>): number {
  return (
    sanitizeNumber(values.proteinPct) +
    sanitizeNumber(values.carbsPct) +
    sanitizeNumber(values.fatPct)
  );
}

export function isMacroPercentSplitValid(
  calories: number | null | undefined,
  values: Partial<MacroPercentValues>,
): boolean {
  const safeCalories = sanitizeNumber(calories);
  if (safeCalories <= 0) return true;
  return sumMacroPercents(values) === 100;
}

export function computeMacroGramsFromPercents(
  calories: number | null | undefined,
  values: Partial<MacroPercentValues>,
): MacroGramValues {
  const safeCalories = sanitizeNumber(calories);
  if (safeCalories <= 0) return { protein: 0, carbs: 0, fat: 0 };

  const proteinPct = sanitizeNumber(values.proteinPct);
  const carbsPct = sanitizeNumber(values.carbsPct);
  const fatPct = sanitizeNumber(values.fatPct);

  return {
    protein: Math.round((safeCalories * proteinPct) / 100 / KCAL_PER_GRAM.protein),
    carbs: Math.round((safeCalories * carbsPct) / 100 / KCAL_PER_GRAM.carbs),
    fat: Math.round((safeCalories * fatPct) / 100 / KCAL_PER_GRAM.fat),
  };
}

export function deriveMacroPercentsFromTargets(
  calories: number | null | undefined,
  grams: Partial<MacroGramValues>,
): MacroPercentValues {
  const safeCalories = sanitizeNumber(calories);
  if (safeCalories <= 0) return { proteinPct: 0, carbsPct: 0, fatPct: 0 };

  const proteinPct = (sanitizeNumber(grams.protein) * KCAL_PER_GRAM.protein / safeCalories) * 100;
  const carbsPct = (sanitizeNumber(grams.carbs) * KCAL_PER_GRAM.carbs / safeCalories) * 100;
  const fatPct = (sanitizeNumber(grams.fat) * KCAL_PER_GRAM.fat / safeCalories) * 100;

  return normalizeToHundred({ proteinPct, carbsPct, fatPct });
}
