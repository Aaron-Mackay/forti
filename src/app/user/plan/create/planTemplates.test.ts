import { describe, expect, it } from 'vitest'

import { parseRepRange, getDefaultRepsFromParsedRepRange, REP_RANGE_AMRAP_DEFAULT_REPS } from '@/lib/repRange'
import { PLAN_TEMPLATES } from './planTemplates'

describe('template rep defaults use shared parser behavior', () => {
  it('uses floor/min defaults for exact, range, plus and AMRAP', () => {
    const exact = parseRepRange('10')
    const range = parseRepRange('5-10')
    const plus = parseRepRange('5+')
    const amrap = parseRepRange('AMRAP')

    expect(exact && getDefaultRepsFromParsedRepRange(exact)).toBe(10)
    expect(range && getDefaultRepsFromParsedRepRange(range)).toBe(5)
    expect(plus && getDefaultRepsFromParsedRepRange(plus)).toBe(5)
    expect(amrap && getDefaultRepsFromParsedRepRange(amrap)).toBe(REP_RANGE_AMRAP_DEFAULT_REPS)
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
