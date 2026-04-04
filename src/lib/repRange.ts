import { z } from 'zod'

export const REP_RANGE_AMRAP_DEFAULT_REPS = 8

export type RepRangeValue =
  | { kind: 'exact'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'plus'; min: number }
  | { kind: 'amrap' }

export type ParsedRepRange = RepRangeValue

const EXACT_RE = /^(\d+)$/
const RANGE_RE = /^(\d+)\s*-\s*(\d+)$/
const PLUS_RE = /^(\d+)\s*\+$/
const AMRAP_RE = /^amrap$/i
const LEGACY_PYRAMID_RE = /^(\d+)(?:\s*-\s*\d+){2,}$/

export function parseRepRange(input: string): RepRangeValue | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  if (AMRAP_RE.test(value)) {
    return { kind: 'amrap' }
  }

  const exactMatch = value.match(EXACT_RE)
  if (exactMatch) {
    const exact = Number.parseInt(exactMatch[1], 10)
    return exact > 0 ? { kind: 'exact', value: exact } : null
  }

  const rangeMatch = value.match(RANGE_RE)
  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1], 10)
    const max = Number.parseInt(rangeMatch[2], 10)
    if (min <= 0 || max <= 0 || min > max) {
      return null
    }
    return { kind: 'range', min, max }
  }

  const plusMatch = value.match(PLUS_RE)
  if (plusMatch) {
    const min = Number.parseInt(plusMatch[1], 10)
    return min > 0 ? { kind: 'plus', min } : null
  }

  return null
}

export function normalizeRepRange(input: string): string | null {
  const parsed = parseRepRange(input)
  if (!parsed) {
    return null
  }

  switch (parsed.kind) {
    case 'exact':
      return String(parsed.value)
    case 'range':
      return `${parsed.min}-${parsed.max}`
    case 'plus':
      return `${parsed.min}+`
    case 'amrap':
      return 'AMRAP'
  }
}

function normalizeLegacyRepRange(input: string): string | null {
  const trimmed = input.trim()

  if (trimmed === '') {
    return ''
  }

  if (LEGACY_PYRAMID_RE.test(trimmed)) {
    return trimmed.split('-').map((part) => part.trim()).join('-')
  }

  return null
}

export function getDefaultRepsFromParsedRepRange(parsed: ParsedRepRange): number {
  switch (parsed.kind) {
    case 'exact':
      return parsed.value
    case 'range':
      return parsed.min
    case 'plus':
      return parsed.min
    case 'amrap':
      return REP_RANGE_AMRAP_DEFAULT_REPS
  }
}

export const RepRangeSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeRepRange(value)

  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid repRange format. Use exact ("10"), range ("5-10"), plus ("5+"), or "AMRAP".',
    })

    return z.NEVER
  }

  return normalized
})

export const NullableRepRangeSchema = RepRangeSchema.nullable().optional()

export const NullablePlanRepRangeSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeRepRange(value) ?? normalizeLegacyRepRange(value)

  if (normalized === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid repRange format.',
    })

    return z.NEVER
  }

  return normalized
}).nullable().optional()
