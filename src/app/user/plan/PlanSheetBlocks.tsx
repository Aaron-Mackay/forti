'use client'

import React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlanPrisma, WorkoutPrisma, WorkoutExercisePrisma } from '@/types/dataTypes'
import { computeE1rm } from '@lib/e1rm'
import { getExerciseSetModel } from './exerciseSetModel'
import { stripWorkoutSuffix } from './planPresentation'
import { EditableExerciseNameWithMeta } from './PlanExercisePrimitives'
import { cellSx, headerCellSx, inputSx, MenuState, WorkoutEditorDispatch } from './PlanSheetShared'

type WeekData = PlanPrisma['weeks'][number]

type SortableExerciseTbodyProps = {
  ex: WorkoutExercisePrisma
  exFullIndex: number
  exerciseCount: number
  maxSets: number
  planId: number
  weekId: number
  workoutId: number
  dispatch: WorkoutEditorDispatch
  arrangeMode: boolean
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void
  setMenuState: (state: MenuState | null) => void
  bestE1rm: number | null
  repRangeInvalid: boolean
  onRepRangeFocus?: (exerciseId: number) => void
  onRepRangeBlur?: (exerciseId: number) => void
}

const SortableExerciseTbody = ({
  ex,
  exFullIndex,
  exerciseCount,
  maxSets,
  planId,
  weekId,
  workoutId,
  dispatch,
  arrangeMode,
  openRenamePicker,
  setMenuState,
  bestE1rm,
  repRangeInvalid,
  onRepRangeFocus,
  onRepRangeBlur,
}: SortableExerciseTbodyProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `ex-${ex.id}`,
  })

  const { topLevelSets, dropsByParent } = getExerciseSetModel(ex)

  return (
    <tbody
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'table-row-group',
      }}
    >
      <tr>
        <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {arrangeMode && (
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', marginRight: '4px', opacity: 0.45, verticalAlign: 'middle', display: 'inline-flex' }}
            >
              <DragHandleIcon style={{ fontSize: '0.9rem' }} />
            </span>
          )}
          {!arrangeMode ? (
            <EditableExerciseNameWithMeta
              name={ex.exercise?.name}
              isBfr={ex.isBfr}
              compact
              onClick={() => openRenamePicker(weekId, workoutId, ex.id)}
            />
          ) : (
            <Box component="span" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {ex.exercise?.name ?? ''}
            </Box>
          )}
        </td>
        <td style={{ ...cellSx, textAlign: 'center' }}>
          <input
            type="text"
            value={ex.repRange ?? ''}
            onChange={(event) => dispatch({ type: 'UPDATE_REP_RANGE', planId, weekId, workoutId, workoutExerciseId: ex.id, repRange: event.target.value })}
            onFocus={() => onRepRangeFocus?.(ex.id)}
            onBlur={() => onRepRangeBlur?.(ex.id)}
            placeholder="—"
            style={{
              ...inputSx,
              width: '3.5em',
              borderColor: repRangeInvalid ? 'var(--mui-palette-error-main, #d32f2f)' : undefined,
              boxShadow: repRangeInvalid ? '0 0 0 1px var(--mui-palette-error-main, #d32f2f) inset' : 'none',
            }}
          />
        </td>
        <td style={{ ...cellSx, textAlign: 'center' }}>
          <input
            type="text"
            value={ex.restTime ?? ''}
            onChange={(event) => dispatch({ type: 'UPDATE_REST_TIME', planId, weekId, workoutId, workoutExerciseId: ex.id, restTime: event.target.value })}
            placeholder="—"
            style={{ ...inputSx, width: '3.5em' }}
          />
        </td>
        {Array.from({ length: maxSets }, (_, setIndex) => {
          const set = topLevelSets[setIndex]
          if (!set) {
            return (
              <React.Fragment key={setIndex}>
                <td style={{ ...cellSx,  color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                <td style={{ ...cellSx,  color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
              </React.Fragment>
            )
          }

          return (
            <React.Fragment key={setIndex}>
              <td style={{ ...cellSx, textAlign: 'center' }}>
                <input
                  type="number"
                  value={set.weight ?? ''}
                  onChange={(event) => {
                    const value = event.target.value === '' ? null : parseFloat(event.target.value)
                    dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: ex.id, setId: set.id, weight: isNaN(value as number) ? null : value })
                  }}
                  placeholder="kg"
                  style={inputSx}
                />
              </td>
              <td style={{ ...cellSx, textAlign: 'center' }}>
                <input
                  type="number"
                  value={set.reps ?? ''}
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10)
                    if (!isNaN(value)) {
                      dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: ex.id, setId: set.id, reps: value })
                    }
                  }}
                  placeholder="reps"
                  style={inputSx}
                />
              </td>
            </React.Fragment>
          )
        })}
        <td style={{ ...cellSx, textAlign: 'right', color: 'var(--mui-palette-text-disabled, #bbb)', fontSize: '0.68rem' }}>
          {bestE1rm != null ? `~${Math.round(bestE1rm)}` : '—'}
        </td>
        <td style={{ ...cellSx,  padding: '0 2px' }}>
          {!arrangeMode && (
            <IconButton
              size="small"
              sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
              onClick={(event) => setMenuState({
                anchor: event.currentTarget,
                weekId,
                workoutId,
                exerciseId: ex.id,
                exerciseIndex: exFullIndex,
                exerciseCount,
                isCardio: false,
              })}
              aria-label="Exercise options"
            >
              <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )}
        </td>
      </tr>

      {topLevelSets.map((parentSet) => {
        const childDropSets = dropsByParent.get(parentSet.id) ?? []
        return childDropSets.map((dropSet, dropIndex) => (
          <tr key={dropSet.id}>
            <td style={{ ...cellSx, textAlign: 'left', paddingLeft: '1.5rem', color: 'var(--mui-palette-text-secondary, #666)', fontSize: '0.7rem' }}>
              ↓ Drop {dropIndex + 1}
            </td>
            <td style={{ ...cellSx }} />
            <td style={{ ...cellSx }} />
            {Array.from({ length: maxSets }, (_, columnIndex) => {
              if (columnIndex !== 0) {
                return (
                  <React.Fragment key={columnIndex}>
                    <td style={{ ...cellSx,  color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                    <td style={{ ...cellSx,  color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                  </React.Fragment>
                )
              }

              return (
                <React.Fragment key={columnIndex}>
                  <td style={{ ...cellSx, textAlign: 'center' }}>
                    <input
                      type="number"
                      value={dropSet.weight ?? ''}
                      onChange={(event) => {
                        const value = event.target.value === '' ? null : parseFloat(event.target.value)
                        dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: ex.id, setId: dropSet.id, weight: isNaN(value as number) ? null : value })
                      }}
                      placeholder="kg"
                      style={inputSx}
                    />
                  </td>
                  <td style={{ ...cellSx, textAlign: 'center' }}>
                    <input
                      type="number"
                      value={dropSet.reps ?? ''}
                      onChange={(event) => {
                        const value = parseInt(event.target.value, 10)
                        if (!isNaN(value)) {
                          dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: ex.id, setId: dropSet.id, reps: value })
                        }
                      }}
                      placeholder="reps"
                      style={inputSx}
                    />
                  </td>
                </React.Fragment>
              )
            })}
            <td style={{ ...cellSx }} />
            <td style={{ ...cellSx }} />
          </tr>
        ))
      })}
    </tbody>
  )
}

type SortableWorkoutSlotProps = {
  workout: WorkoutPrisma
  planId: number
  weekId: number
  maxSets: number
  workoutCount: number
  creationMode?: boolean
  dispatch: WorkoutEditorDispatch
  arrangeMode: boolean
  openPicker: (weekId: number, workoutId: number) => void
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void
  setMenuState: (state: MenuState | null) => void
  slotIdx: number
  invalidRepRangeIds?: Set<number>
  onRepRangeFocus?: (exerciseId: number) => void
  onRepRangeBlur?: (exerciseId: number) => void
}

const SortableWorkoutSlot = ({
  workout,
  planId,
  weekId,
  maxSets,
  workoutCount,
  creationMode = false,
  dispatch,
  arrangeMode,
  openPicker,
  openRenamePicker,
  setMenuState,
  slotIdx,
  invalidRepRangeIds,
  onRepRangeFocus,
  onRepRangeBlur,
}: SortableWorkoutSlotProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `wo-${workout.id}`,
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )
  const activeSensors = arrangeMode ? sensors : []
  const sortedExercises = [...workout.exercises].sort((a, b) => a.order - b.order)
  const resistanceExercises = sortedExercises.filter((exercise) => exercise.exercise?.category !== 'cardio')
  const cardioExercises = sortedExercises.filter((exercise) => exercise.exercise?.category === 'cardio')
  const totalCols = 5 + maxSets * 2

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = sortedExercises.findIndex((exercise) => `ex-${exercise.id}` === String(active.id))
    const toIndex = sortedExercises.findIndex((exercise) => `ex-${exercise.id}` === String(over.id))
    if (fromIndex < 0 || toIndex < 0) return
    dispatch({ type: 'REORDER_EXERCISE', planId, weekId, workoutId: workout.id, fromIndex, toIndex })
  }

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      sx={{ flexShrink: 0 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {arrangeMode && (
          <Box component="span" {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 0.5, color: 'text.disabled', display: 'inline-flex', alignItems: 'center' }}>
            <DragHandleIcon sx={{ fontSize: '0.85rem' }} />
          </Box>
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.primary', flex: 1 }}>
          {stripWorkoutSuffix(workout.name ?? `Workout ${slotIdx + 1}`)}
        </Typography>
        {!arrangeMode && (
          <IconButton
            size="small"
            disabled={creationMode && workoutCount <= 1}
            sx={{ p: 0.25, ml: 0.5, opacity: 0.35, '&:hover': { opacity: 1 } }}
            onClick={() => dispatch({ type: 'REMOVE_WORKOUT', planId, weekId, workoutId: workout.id })}
            aria-label="Delete workout"
          >
            <CloseIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        )}
      </Box>

      {(resistanceExercises.length > 0 || cardioExercises.length === 0) && (
        <DndContext sensors={activeSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>Exercise</th>
                <th style={{ ...headerCellSx, minWidth: '3rem' }}>TGT</th>
                <th style={{ ...headerCellSx, minWidth: '3rem' }}>REST</th>
                {Array.from({ length: maxSets }, (_, setIndex) => (
                  <React.Fragment key={setIndex}>
                    <th style={{ ...headerCellSx }}>Weight</th>
                    <th style={{ ...headerCellSx }}>Reps</th>
                  </React.Fragment>
                ))}
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>~e1RM</th>
                <th style={{ ...headerCellSx, width: '1.5rem' }} />
              </tr>
            </thead>
            <SortableContext items={resistanceExercises.map((exercise) => `ex-${exercise.id}`)} strategy={verticalListSortingStrategy}>
              {resistanceExercises.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={totalCols} style={{ ...cellSx, color: 'var(--mui-palette-text-disabled, #bbb)', fontStyle: 'italic' }}>
                      No exercises
                    </td>
                  </tr>
                </tbody>
              ) : (
                resistanceExercises.map((exercise) => {
                  let bestE1rm: number | null = null
                  for (const set of exercise.sets) {
                    const e1rm = computeE1rm(set.weight, set.reps)
                    if (e1rm != null && (bestE1rm == null || e1rm > bestE1rm)) bestE1rm = e1rm
                  }

                  return (
                    <SortableExerciseTbody
                      key={exercise.id}
                      ex={exercise}
                      exFullIndex={sortedExercises.findIndex((entry) => entry.id === exercise.id)}
                      exerciseCount={sortedExercises.length}
                      maxSets={maxSets}
                      planId={planId}
                      weekId={weekId}
                      workoutId={workout.id}
                      dispatch={dispatch}
                      arrangeMode={arrangeMode}
                      openRenamePicker={openRenamePicker}
                      setMenuState={setMenuState}
                      bestE1rm={bestE1rm}
                      repRangeInvalid={invalidRepRangeIds?.has(exercise.id) ?? false}
                      onRepRangeFocus={onRepRangeFocus}
                      onRepRangeBlur={onRepRangeBlur}
                    />
                  )
                })
              )}
            </SortableContext>
            {!arrangeMode && (
              <tbody>
                <tr>
                  <td colSpan={totalCols} style={{ padding: '4px 4px 0', borderBottom: 'none' }}>
                    <Box
                      onClick={() => openPicker(weekId, workout.id)}
                      aria-label="Add exercise"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        color: 'primary.main',
                        opacity: 0.35,
                        py: 0.5,
                        '&:hover': { opacity: 0.9 },
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <AddIcon sx={{ fontSize: '1rem' }} />
                    </Box>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </DndContext>
      )}

      {cardioExercises.length > 0 && (
        <Box sx={{ mt: resistanceExercises.length > 0 ? 1 : 0 }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>Cardio</th>
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>Min</th>
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>km</th>
                <th style={{ ...headerCellSx, minWidth: '4rem' }}>Resistance</th>
                <th style={{ ...headerCellSx, width: '1.5rem' }} />
              </tr>
            </thead>
            <tbody>
              {cardioExercises.map((exercise) => (
                <tr key={exercise.id}>
                  <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {!arrangeMode ? (
                      <EditableExerciseNameWithMeta
                        name={exercise.exercise?.name}
                        isBfr={exercise.isBfr}
                        compact
                        onClick={() => openRenamePicker(weekId, workout.id, exercise.id)}
                      />
                    ) : (
                      <Box component="span" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {exercise.exercise?.name ?? ''}
                      </Box>
                    )}
                  </td>
                  {(['cardioDuration', 'cardioDistance', 'cardioResistance'] as const).map((field) => (
                    <td key={field} style={{ ...cellSx, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={exercise[field] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value === '' ? null : parseFloat(event.target.value)
                          dispatch({ type: 'UPDATE_CARDIO_DATA', planId, weekId, workoutId: workout.id, exerciseId: exercise.id, field, value: isNaN(value as number) ? null : value })
                        }}
                        placeholder="—"
                        style={{ ...inputSx, width: '4em' }}
                      />
                    </td>
                  ))}
                  <td style={{ ...cellSx,  padding: '0 2px' }}>
                    {!arrangeMode && (
                      <IconButton
                        size="small"
                        sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                        onClick={(event) => setMenuState({
                          anchor: event.currentTarget,
                          weekId,
                          workoutId: workout.id,
                          exerciseId: exercise.id,
                          exerciseIndex: sortedExercises.findIndex((entry) => entry.id === exercise.id),
                          exerciseCount: sortedExercises.length,
                          isCardio: true,
                        })}
                        aria-label="Exercise options"
                      >
                        <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
              {!arrangeMode && (
                <tr>
                  <td colSpan={5} style={{ padding: '4px 4px 0', borderBottom: 'none' }}>
                    <Box
                      onClick={() => openPicker(weekId, workout.id)}
                      aria-label="Add exercise"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        color: 'primary.main',
                        opacity: 0.35,
                        py: 0.5,
                        '&:hover': { opacity: 0.9 },
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <AddIcon sx={{ fontSize: '1rem' }} />
                    </Box>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  )
}

type WeekBlockProps = {
  week: WeekData
  planId: number
  maxWorkoutCount: number
  slotMaxSets: number[]
  creationMode?: boolean
  dispatch: WorkoutEditorDispatch
  arrangeMode: boolean
  showWeekHeader: boolean
  openPicker: (weekId: number, workoutId: number) => void
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void
  setMenuState: (state: MenuState | null) => void
  invalidRepRangeIds?: Set<number>
  onRepRangeFocus?: (exerciseId: number) => void
  onRepRangeBlur?: (exerciseId: number) => void
}

export function PlanSheetWeekBlock({
  week,
  planId,
  maxWorkoutCount,
  slotMaxSets,
  creationMode = false,
  dispatch,
  arrangeMode,
  showWeekHeader,
  openPicker,
  openRenamePicker,
  setMenuState,
  invalidRepRangeIds,
  onRepRangeFocus,
  onRepRangeBlur,
}: WeekBlockProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )
  const activeSensors = arrangeMode ? sensors : []
  const sortedWorkouts = [...week.workouts].sort((a, b) => a.order - b.order)

  const handleWorkoutDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = sortedWorkouts.findIndex((workout) => `wo-${workout.id}` === String(active.id))
    const toIndex = sortedWorkouts.findIndex((workout) => `wo-${workout.id}` === String(over.id))
    if (fromIndex < 0 || toIndex < 0) return
    dispatch({ type: 'REORDER_WORKOUT', planId, weekId: week.id, fromIndex, toIndex })
  }

  return (
    <Box sx={{ mb: 3 }}>
      {showWeekHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', pb: 0.5, mb: 0.5, borderBottom: '2px solid', borderColor: 'divider', width: '100%' }}>
          <Typography variant="overline" sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', color: 'text.secondary', lineHeight: 1.4 }}>
            Week {week.order}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {!arrangeMode && (
            <IconButton
              size="small"
              sx={{ p: 0.25, opacity: 0.35, '&:hover': { opacity: 1 } }}
              onClick={() => dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id })}
              aria-label="Delete week"
            >
              <CloseIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          )}
        </Box>
      )}

      <DndContext sensors={activeSensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
        <SortableContext items={sortedWorkouts.map((workout) => `wo-${workout.id}`)} strategy={horizontalListSortingStrategy}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
              const workout = sortedWorkouts.find((entry) => entry.order === slotIdx + 1) ?? null
              const maxSets = slotMaxSets[slotIdx]

              if (!workout) {
                return <Box key={slotIdx} sx={{ minWidth: '200px' }} />
              }

              return (
                <SortableWorkoutSlot
                  key={workout.id}
                  workout={workout}
                  planId={planId}
                  weekId={week.id}
                  maxSets={maxSets}
                  workoutCount={sortedWorkouts.length}
                  creationMode={creationMode}
                  dispatch={dispatch}
                  arrangeMode={arrangeMode}
                  openPicker={openPicker}
                  openRenamePicker={openRenamePicker}
                  setMenuState={setMenuState}
                  slotIdx={slotIdx}
                  invalidRepRangeIds={invalidRepRangeIds}
                  onRepRangeFocus={onRepRangeFocus}
                  onRepRangeBlur={onRepRangeBlur}
                />
              )
            })}
            {!arrangeMode && (
              <Box
                sx={{
                  flexShrink: 0,
                  alignSelf: 'stretch',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minWidth: '2.5rem',
                  cursor: 'pointer',
                  color: 'primary.main',
                  opacity: 0.35,
                  '&:hover': { opacity: 0.9 },
                  transition: 'opacity 0.15s',
                }}
                onClick={() => dispatch({ type: 'ADD_WORKOUT', planId, weekId: week.id })}
                aria-label="Add workout"
              >
                <AddIcon sx={{ fontSize: '1rem' }} />
              </Box>
            )}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  )
}
