import { describe, expect, it } from 'vitest'

import { REP_RANGE_AMRAP_DEFAULT_REPS } from '@/lib/repRange'
import { getTemplateDefaultRepsOrThrow, PLAN_TEMPLATES } from './planTemplates'

describe('getTemplateDefaultRepsOrThrow', () => {
  it('uses floor/min defaults for exact, range, and plus', () => {
    expect(getTemplateDefaultRepsOrThrow('10')).toBe(10)
    expect(getTemplateDefaultRepsOrThrow('5-10')).toBe(5)
    expect(getTemplateDefaultRepsOrThrow('5+')).toBe(5)
  })

  it('uses AMRAP fallback default', () => {
    expect(getTemplateDefaultRepsOrThrow('AMRAP')).toBe(REP_RANGE_AMRAP_DEFAULT_REPS)
  })

  it('throws on malformed ranges so callers can recover/edit', () => {
    expect(() => getTemplateDefaultRepsOrThrow('not-a-range')).toThrow('Invalid repRange template value')
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
