import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import PlanMultiWeekTable from './PlanMultiWeekTable'

const dispatch = vi.fn()
const debouncedDispatch = vi.fn()

vi.mock('@/context/WorkoutEditorContext', () => ({
  useWorkoutEditorContext: () => ({ allExercises: [], dispatch, debouncedDispatch }),
}))

vi.mock('@/app/user/workout/ExercisePickerDialog', () => ({ default: () => null }))
vi.mock('./ExerciseDetailsDialog', () => ({ default: () => null }))
vi.mock('./ExerciseMenuItems', () => ({
  ExerciseMenuActionItem: () => null,
  ExerciseMenuDropAndBfrItems: () => null,
}))
vi.mock('./exerciseMenuActions', () => ({
  hasTrailingDropSets: () => false,
  removeExercises: () => undefined,
  removeTrailingDropSets: () => undefined,
  setBfrEnabled: () => undefined,
}))
vi.mock('./exerciseSetModel', async () => {
  const actual = await vi.importActual<typeof import('./exerciseSetModel')>('./exerciseSetModel')
  return {
    ...actual,
    confirmRemoveLastSetWithDrops: () => true,
    getExerciseSetModel: (exercise: { sets: Array<{ isDropSet?: boolean }> }) => ({
      topLevelSets: exercise.sets.filter((set) => !set.isDropSet),
      trailingDropSets: [],
      lastTopLevelSet: exercise.sets[exercise.sets.length - 1] ?? null,
    }),
  }
})
vi.mock('./PlanExercisePrimitives', () => ({
  buildExerciseMetaParts: () => [],
  EditableExerciseNameWithMeta: ({ name }: { name: string }) => <span>{name}</span>,
  CompactSetEditor: ({
    label,
    weight,
    onWeightChange,
  }: {
    label: string
    weight: number | null
    onWeightChange: (weight: number | null) => void
  }) => (
    <input
      aria-label={`weight-${label}`}
      value={weight ?? ''}
      onChange={(event) => {
        const raw = event.target.value
        onWeightChange(raw === '' ? null : Number(raw))
      }}
    />
  ),
  SetCountControls: () => null,
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

function makeSet(id: number, order: number, weight: number | null, reps: number | null) {
  return {
    id,
    order,
    weight,
    reps,
    isDropSet: false,
    parentSetId: null,
  }
}

function makeExercise(
  id: number,
  order: number,
  exerciseId: number,
  name: string,
  setId: number,
  setWeight: number,
) {
  return {
    id,
    workoutId: 10,
    order,
    exercise: { id: exerciseId, name, category: 'resistance' },
    sets: [makeSet(setId, 1, setWeight, 5)],
    isBfr: false,
    repRange: null,
    restTime: null,
    targetRpe: null,
    targetRir: null,
  }
}

describe('PlanMultiWeekTable duplicate exercise rows', () => {
  it('renders duplicate exercise entries as separate rows in classic view', () => {
    const plan = {
      id: 1,
      weeks: [
        {
          id: 1,
          order: 1,
          workouts: [
            {
              id: 10,
              order: 1,
              name: 'Workout 1',
              notes: null,
              exercises: [
                makeExercise(101, 1, 1001, 'Bench Press', 10001, 100),
                makeExercise(102, 2, 1001, 'Bench Press', 10002, 90),
              ],
            },
          ],
        },
      ],
    }

    render(<PlanMultiWeekTable plan={plan as never} planId={1} />)

    expect(screen.getAllByText('Bench Press')).toHaveLength(2)
  })

  it('updates only the selected duplicate row set when editing', () => {
    dispatch.mockClear()
    const plan = {
      id: 1,
      weeks: [
        {
          id: 1,
          order: 1,
          workouts: [
            {
              id: 10,
              order: 1,
              name: 'Workout 1',
              notes: null,
              exercises: [
                makeExercise(201, 1, 2001, 'Bench Press', 20001, 100),
                makeExercise(202, 2, 2001, 'Bench Press', 20002, 90),
              ],
            },
          ],
        },
      ],
    }

    render(<PlanMultiWeekTable plan={plan as never} planId={1} />)

    const weightInputs = screen.getAllByLabelText('weight-S1')
    fireEvent.change(weightInputs[1], { target: { value: '77' } })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SET_WEIGHT',
      planId: 1,
      weekId: 1,
      workoutId: 10,
      exerciseId: 202,
      setId: 20002,
      weight: 77,
    })
  })
})
