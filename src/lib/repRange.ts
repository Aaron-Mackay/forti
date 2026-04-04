export const REP_RANGE_AMRAP_DEFAULT_REPS = 8

export type ParsedRepRange =
  | { kind: 'exact'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'plus'; min: number }
  | { kind: 'amrap' }

function toPositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null
  }

  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

export function parseRepRange(rawRepRange: string): ParsedRepRange | null {
  const value = rawRepRange.trim()
  if (!value) {
    return null
  }

  if (/^amrap$/i.test(value)) {
    return { kind: 'amrap' }
  }

  const rangeMatch = value.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    const min = toPositiveInt(rangeMatch[1])
    const max = toPositiveInt(rangeMatch[2])
    if (min === null || max === null || min > max) {
      return null
    }
    return { kind: 'range', min, max }
  }

  const plusMatch = value.match(/^(\d+)\s*\+$/)
  if (plusMatch) {
    const min = toPositiveInt(plusMatch[1])
    return min === null ? null : { kind: 'plus', min }
  }

  const exact = toPositiveInt(value)
  return exact === null ? null : { kind: 'exact', value: exact }
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
