'use client'

import React, { useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
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
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNewPlan } from './useNewPlan'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { WorkoutPrisma, WorkoutExercisePrisma } from '@/types/dataTypes'
import { savePlan } from '@lib/clientApi'
import { useRouter } from 'next/navigation'
import { Exercise } from '@prisma/client'
import { ActionDispatch } from 'react'
import { WorkoutEditorAction } from '@lib/useWorkoutEditor'

// ── Sortable exercise row ──────────────────────────────────────────────────────

const SortableExerciseRow = ({
  ex,
  exerciseCount,
  allExercises,
  dispatch,
  planId,
}: {
  ex: WorkoutExercisePrisma
  exerciseCount: number
  allExercises: Exercise[]
  dispatch: ActionDispatch<[WorkoutEditorAction]>
  planId: number
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ex.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton size="small" sx={{ cursor: 'grab', touchAction: 'none', color: 'text.disabled' }} {...attributes} {...listeners}>
          <DragHandleIcon fontSize="small" />
        </IconButton>
        <Autocomplete
          freeSolo
          sx={{ flex: 1 }}
          size="small"
          options={allExercises.map((e) => e.name)}
          inputValue={ex.exercise.name}
          onInputChange={(_, newValue) => {
            dispatch({
              type: 'UPDATE_EXERCISE',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
              workoutExerciseId: ex.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: (ex.exercise.category ?? 'resistance') as any,
              exerciseName: newValue,
              exercises: allExercises,
            })
          }}
          renderInput={(params) => (
            <TextField {...params} label="Exercise" autoComplete="off" />
          )}
        />
        {exerciseCount > 1 && (
          <IconButton
            size="small"
            onClick={() =>
              dispatch({
                type: 'REMOVE_EXERCISE',
                planId,
                weekId: PLACEHOLDER_ID,
                workoutId: ex.workoutId,
                exerciseId: ex.id,
              })
            }
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, pl: '40px' }}>
        <TextField
          size="small"
          sx={{ flex: 1 }}
          label="Sets"
          value={ex.sets.length}
          autoComplete="off"
          inputMode="numeric"
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_SET_COUNT',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
              workoutExerciseId: ex.id,
              setCount: parseInt(e.target.value) || 1,
            })
          }
        />
        <TextField
          size="small"
          sx={{ flex: 1 }}
          label="Reps"
          value={ex.repRange ?? ''}
          autoComplete="off"
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_REP_RANGE',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
              workoutExerciseId: ex.id,
              repRange: e.target.value,
            })
          }
        />
        <TextField
          size="small"
          sx={{ flex: 1 }}
          label="Rest"
          value={ex.restTime ?? ''}
          autoComplete="off"
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_REST_TIME',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
              workoutExerciseId: ex.id,
              restTime: e.target.value,
            })
          }
        />
      </Box>
    </Box>
  )
}

// ── Sortable workout card ──────────────────────────────────────────────────────

const SortableWorkoutCard = ({
  workout,
  showDelete,
  allExercises,
  dispatch,
  planId,
}: {
  workout: WorkoutPrisma
  showDelete: boolean
  allExercises: Exercise[]
  dispatch: ActionDispatch<[WorkoutEditorAction]>
  planId: number
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: workout.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const exercises = workout.exercises
    const fromIndex = exercises.findIndex((ex) => ex.id === active.id)
    const toIndex = exercises.findIndex((ex) => ex.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    dispatch({
      type: 'REORDER_EXERCISE',
      planId,
      weekId: PLACEHOLDER_ID,
      workoutId: workout.id,
      fromIndex,
      toIndex,
    })
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton size="small" sx={{ cursor: 'grab', touchAction: 'none' }} {...attributes} {...listeners}>
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <TextField
          size="small"
          sx={{ flex: 1 }}
          label="Workout name"
          value={workout.name}
          autoComplete="off"
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_WORKOUT_NAME',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: workout.id,
              name: e.target.value,
            })
          }
        />
        <IconButton
          size="small"
          onClick={() =>
            dispatch({
              type: 'DUPLICATE_WORKOUT',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: workout.id,
            })
          }
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        {showDelete && (
          <IconButton
            size="small"
            onClick={() =>
              dispatch({
                type: 'REMOVE_WORKOUT',
                planId,
                weekId: PLACEHOLDER_ID,
                workoutId: workout.id,
              })
            }
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
        <SortableContext items={workout.exercises.map((ex) => ex.id)} strategy={verticalListSortingStrategy}>
          {workout.exercises.map((ex, i) => (
            <React.Fragment key={ex.id}>
              {i > 0 && <Divider />}
              <SortableExerciseRow
                ex={ex}
                exerciseCount={workout.exercises.length}
                allExercises={allExercises}
                dispatch={dispatch}
                planId={planId}
              />
            </React.Fragment>
          ))}
        </SortableContext>
      </DndContext>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() =>
          dispatch({
            type: 'ADD_EXERCISE_WITH_SET',
            planId: PLACEHOLDER_ID,
            weekId: PLACEHOLDER_ID,
            workoutId: workout.id,
          })
        }
      >
        Add exercise
      </Button>
    </Paper>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

type PlanEditorScreenProps = {
  weekCount: string
  setWeekCount: (v: string) => void
}

export const PlanEditorScreen = ({ weekCount, setWeekCount }: PlanEditorScreenProps) => {
  const { statePlan, dispatch } = useNewPlan()
  const { allExercises } = useWorkoutEditorContext()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const workouts = statePlan.weeks[0].workouts

  const canSave =
    !!statePlan.name.trim() &&
    workouts.every((wo) => wo.exercises.every((ex) => ex.exercise.name.trim()))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const response = await savePlan(statePlan)
      if (response.success) {
        router.push(`/user/plan/${response.planId}`)
      } else {
        setSaveError(response.error || 'Failed to save plan. Please try again.')
      }
    } catch {
      setSaveError('Failed to save plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleWorkoutDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = workouts.findIndex((wo) => wo.id === active.id)
    const toIndex = workouts.findIndex((wo) => wo.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    dispatch({
      type: 'REORDER_WORKOUT',
      planId: statePlan.id,
      weekId: PLACEHOLDER_ID,
      fromIndex,
      toIndex,
    })
  }

  return (
    <>
      {/* Scrollable content with bottom padding for sticky button */}
      <Box sx={{ pb: '80px' }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Plan name"
            value={statePlan.name}
            autoComplete="off"
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_PLAN_NAME',
                planId: statePlan.id,
                name: e.target.value,
              })
            }
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Duration"
              value={weekCount}
              inputMode="numeric"
              sx={{ width: '6em' }}
              autoComplete="off"
              onChange={(e) => setWeekCount(e.target.value.replace(/\D/g, ''))}
            />
            <Typography variant="body2" color="text.secondary">
              weeks
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary' }}>
          Week template
        </Typography>

        <Box sx={{ p: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
            <SortableContext items={workouts.map((wo) => wo.id)} strategy={verticalListSortingStrategy}>
              {workouts.map((wo) => (
                <SortableWorkoutCard
                  key={wo.id}
                  workout={wo}
                  showDelete={workouts.length > 1}
                  allExercises={allExercises}
                  dispatch={dispatch}
                  planId={statePlan.id}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              dispatch({
                type: 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET',
                planId: PLACEHOLDER_ID,
                weekId: PLACEHOLDER_ID,
              })
            }
          >
            Add workout day
          </Button>
        </Box>
      </Box>

      {/* Sticky save button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 1,
        }}
      >
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
      </Box>

      <Snackbar open={!!saveError} autoHideDuration={4000} onClose={() => setSaveError(null)}>
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>
    </>
  )
}
