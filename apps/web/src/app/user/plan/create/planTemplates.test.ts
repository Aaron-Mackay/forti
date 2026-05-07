import { describe, expect, it } from 'vitest'

import { parseRepRange } from '@/lib/repRange'
import { PLAN_TEMPLATES } from './planTemplates'

const TEMPLATE_AMRAP_DEFAULT_REPS = 8

function deriveTemplateDefaultReps(repRange: string): number {
  const parsed = parseRepRange(repRange)
  if (!parsed) {
    throw new Error('Invalid rep range')
  }

  switch (parsed.kind) {
    case 'exact':
      return parsed.value
    case 'range':
      return parsed.min
    case 'plus':
      return parsed.min
    case 'amrap':
      return TEMPLATE_AMRAP_DEFAULT_REPS
  }
}

describe('template rep defaults use shared parser behavior', () => {
  it('uses floor/min defaults for exact, range, plus and AMRAP', () => {
    expect(deriveTemplateDefaultReps('10')).toBe(10)
    expect(deriveTemplateDefaultReps('5-10')).toBe(5)
    expect(deriveTemplateDefaultReps('5+')).toBe(5)
    expect(deriveTemplateDefaultReps('AMRAP')).toBe(TEMPLATE_AMRAP_DEFAULT_REPS)
  })
})

describe('PLAN_TEMPLATES', () => {
  it('seeds set reps from parsed rep range values', () => {
    const pplBench = PLAN_TEMPLATES[0].plan.weeks[0].workouts[0].exercises[0]
    expect(pplBench.repRange).toBe('8-10')
    expect(pplBench.sets.every((set) => set.reps === 8)).toBe(true)

    const fullBodySquat = PLAN_TEMPLATES[1].plan.weeks[0].workouts[0].exercises[0]
    expect(fullBodySquat.repRange).toBe('5')
    expect(fullBodySquat.sets.every((set) => set.reps === 5)).toBe(true)
  })
})
