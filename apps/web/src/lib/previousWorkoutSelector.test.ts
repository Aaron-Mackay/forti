import { describe, expect, it } from 'vitest'
import { selectPreviousWorkoutCandidate, selectPreviousWorkoutCandidates } from './previousWorkoutSelector'

describe('previousWorkoutSelector', () => {
  it('picks the closest previous candidate', () => {
    const selected = selectPreviousWorkoutCandidate(
      [
        { sortValue: 1, workoutId: 11, value: 'wk1' },
        { sortValue: 3, workoutId: 13, value: 'wk3' },
        { sortValue: 2, workoutId: 12, value: 'wk2' },
      ],
      { currentSortValue: 4 },
    )

    expect(selected).toBe('wk3')
  })

  it('respects tracked-data requirement and explicit workout/exercise filters', () => {
    const selected = selectPreviousWorkoutCandidate(
      [
        { sortValue: 1, workoutOrder: 1, exerciseId: 100, hasTrackedData: false, value: 'untracked' },
        { sortValue: 2, workoutOrder: 2, exerciseId: 100, hasTrackedData: true, value: 'wrong-slot' },
        { sortValue: 3, workoutOrder: 1, exerciseId: 101, hasTrackedData: true, value: 'wrong-ex' },
        { sortValue: 4, workoutOrder: 1, exerciseId: 100, hasTrackedData: true, value: 'match' },
      ],
      {
        currentSortValue: 5,
        targetWorkoutOrder: 1,
        targetExerciseId: 100,
        requireTrackedData: true,
      },
    )

    expect(selected).toBe('match')
  })

  it('returns empty/null when no previous candidate exists', () => {
    const list = selectPreviousWorkoutCandidates(
      [{ sortValue: 5, value: 'same-or-future' }],
      { currentSortValue: 5 },
    )
    const single = selectPreviousWorkoutCandidate(
      [{ sortValue: 6, value: 'future' }],
      { currentSortValue: 5 },
    )

    expect(list).toEqual([])
    expect(single).toBeNull()
  })

  it('uses deterministic tiebreak by workoutId descending', () => {
    const selected = selectPreviousWorkoutCandidate(
      [
        { sortValue: 3, workoutId: 101, value: 'older-id' },
        { sortValue: 3, workoutId: 102, value: 'newer-id' },
      ],
      { currentSortValue: 4 },
    )

    expect(selected).toBe('newer-id')
  })
})
