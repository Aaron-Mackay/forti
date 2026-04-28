import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExerciseProgressCard from './ExerciseProgressCard'
import { PlanSheetWeekBlock } from './PlanSheetBlocks'

vi.mock('@/context/WorkoutEditorContext', () => ({
  useWorkoutEditorContext: () => ({ allExercises: [], dispatch: vi.fn() }),
}))

vi.mock('./PlanExercisePrimitives', () => ({
  buildExerciseMetaParts: () => [],
  EditableExerciseNameWithMeta: ({ name }: { name?: string | null }) => <span>{name ?? 'Exercise'}</span>,
  CompactSetEditor: () => <div>set-editor</div>,
  SetCountControls: () => <div>set-controls</div>,
}))

vi.mock('./ExerciseMenuItems', () => ({
  ExerciseMenuActionItem: () => null,
  ExerciseMenuDropAndBfrItems: () => null,
  ExerciseMenuMoveItems: () => null,
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
  }
})

vi.mock('@/app/user/workout/ExercisePickerDialog', () => ({ default: () => null }))
vi.mock('./ExerciseDetailsDialog', () => ({ default: () => null }))
vi.mock('./PlanSheetShared', () => ({
  cellSx: {},
  headerCellSx: {},
  inputSx: {},
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
  horizontalListSortingStrategy: {},
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}))

function makeSet(id: number, order: number, weight: number | null, reps: number | null) {
  return { id, order, weight, reps, isDropSet: false, parentSetId: null }
}

function makeExercise(id: number, exerciseId: number, weight: number | null, reps: number | null) {
  return {
    id,
    order: 1,
    exercise: { id: exerciseId, name: 'Bench Press', category: 'chest' },
    sets: [makeSet(id * 10, 1, weight, reps)],
    isBfr: false,
    repRange: null,
    restTime: null,
    targetRpe: null,
    targetRir: null,
  }
}

describe('e1RM delta indicator rendering', () => {
  it('shows classic view increase/decrease/flat/none indicators', () => {
    const baseProps = {
      index: 0,
      planId: 1,
      weekId: 1,
      workoutId: 1,
      isFirst: true,
      isLast: true,
    }

    const { rerender } = render(
      <ExerciseProgressCard
        {...baseProps}
        exerciseLink={makeExercise(101, 11, 105, 5) as never}
        prevExercise={makeExercise(201, 11, 100, 5) as never}
      />,
    )
    expect(screen.getByLabelText('e1RM increased from previous week')).toBeInTheDocument()

    rerender(
      <ExerciseProgressCard
        {...baseProps}
        exerciseLink={makeExercise(102, 11, 95, 5) as never}
        prevExercise={makeExercise(202, 11, 100, 5) as never}
      />,
    )
    expect(screen.getByLabelText('e1RM decreased from previous week')).toBeInTheDocument()

    rerender(
      <ExerciseProgressCard
        {...baseProps}
        exerciseLink={makeExercise(103, 11, 100, 5) as never}
        prevExercise={makeExercise(203, 11, 100, 5) as never}
      />,
    )
    expect(screen.getByLabelText('e1RM unchanged from previous week')).toBeInTheDocument()

    rerender(
      <ExerciseProgressCard
        {...baseProps}
        exerciseLink={makeExercise(104, 11, null, 5) as never}
        prevExercise={makeExercise(204, 11, 100, 5) as never}
      />,
    )
    expect(screen.queryByLabelText('e1RM increased from previous week')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('e1RM decreased from previous week')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('e1RM unchanged from previous week')).not.toBeInTheDocument()
  })

  it('shows sheet view increase/decrease/flat/none indicators', () => {
    const renderWeek = (currentWeight: number | null, previousWeight: number | null) => {
      const weekOneExercise = makeExercise(301, 21, previousWeight, 5)
      const weekTwoExercise = makeExercise(302, 21, currentWeight, 5)
      const plan = {
        id: 1,
        weeks: [
          {
            id: 1,
            order: 1,
            workouts: [{ id: 11, order: 1, name: 'Workout A', exercises: [weekOneExercise] }],
          },
          {
            id: 2,
            order: 2,
            workouts: [{ id: 22, order: 1, name: 'Workout A', exercises: [weekTwoExercise] }],
          },
        ],
      }

      return render(
        <PlanSheetWeekBlock
          plan={plan as never}
          week={plan.weeks[1] as never}
          planId={1}
          maxWorkoutCount={1}
          slotMaxSets={[1]}
          dispatch={vi.fn()}
          arrangeMode={false}
          showWeekHeader={false}
          openPicker={vi.fn()}
          openRenamePicker={vi.fn()}
          setMenuState={vi.fn()}
        />,
      )
    }

    const up = renderWeek(105, 100)
    expect(screen.getByLabelText('e1RM increased from previous week')).toBeInTheDocument()
    up.unmount()

    const down = renderWeek(95, 100)
    expect(screen.getByLabelText('e1RM decreased from previous week')).toBeInTheDocument()
    down.unmount()

    const flat = renderWeek(100, 100)
    expect(screen.getByLabelText('e1RM unchanged from previous week')).toBeInTheDocument()
    flat.unmount()

    renderWeek(100, null)
    expect(screen.queryByLabelText('e1RM increased from previous week')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('e1RM decreased from previous week')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('e1RM unchanged from previous week')).not.toBeInTheDocument()
  })
})
