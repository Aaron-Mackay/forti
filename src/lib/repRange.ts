import { z } from 'zod';

export type RepRangeValue =
  | { kind: 'exact'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'plus'; min: number }
  | { kind: 'amrap' };

const EXACT_RE = /^(\d+)$/;
const RANGE_RE = /^(\d+)\s*-\s*(\d+)$/;
const PLUS_RE = /^(\d+)\s*\+$/;
const AMRAP_RE = /^amrap$/i;
const LEGACY_PYRAMID_RE = /^(\d+)(?:\s*-\s*\d+){2,}$/;

export function parseRepRange(input: string): RepRangeValue | null {
  const value = input.trim();

  if (AMRAP_RE.test(value)) {
    return { kind: 'amrap' };
  }

  const exactMatch = value.match(EXACT_RE);
  if (exactMatch) {
    return { kind: 'exact', value: Number(exactMatch[1]) };
  }

  const rangeMatch = value.match(RANGE_RE);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (min > max) {
      return null;
    }
    return { kind: 'range', min, max };
  }

  const plusMatch = value.match(PLUS_RE);
  if (plusMatch) {
    return { kind: 'plus', min: Number(plusMatch[1]) };
  }

  return null;
}

export function normalizeRepRange(input: string): string | null {
  const parsed = parseRepRange(input);
  if (!parsed) {
    return null;
  }

  switch (parsed.kind) {
    case 'exact':
      return String(parsed.value);
    case 'range':
      return `${parsed.min}-${parsed.max}`;
    case 'plus':
      return `${parsed.min}+`;
    case 'amrap':
      return 'AMRAP';
    default:
      return null;
  }
}



function normalizeLegacyRepRange(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed === '') {
    return '';
  }

  if (LEGACY_PYRAMID_RE.test(trimmed)) {
    return trimmed.split('-').map(part => part.trim()).join('-');
  }

  return null;
}

export const RepRangeSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeRepRange(value);

  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid repRange format. Use exact ("10"), range ("5-10"), plus ("5+"), or "AMRAP".',
    });

    return z.NEVER;
  }

  return normalized;
});

export const NullableRepRangeSchema = RepRangeSchema.nullable().optional();


export const NullablePlanRepRangeSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeRepRange(value) ?? normalizeLegacyRepRange(value);

  if (normalized === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid repRange format.',
    });

    return z.NEVER;
  }

  return normalized;
}).nullable().optional();
