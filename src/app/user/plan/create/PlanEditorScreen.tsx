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
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useNewPlan } from './useNewPlan'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { WorkoutPrisma, WorkoutExercisePrisma } from '@/types/dataTypes'
import { savePlan } from '@lib/clientApi'
import { useRouter } from 'next/navigation'
import { Exercise } from '@prisma/client'
import { ActionDispatch } from 'react'
import { WorkoutEditorAction } from '@lib/useWorkoutEditor'

// ── Exercise row ──────────────────────────────────────────────────────────────

const ExerciseRow = ({
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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
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

// ── Workout card ──────────────────────────────────────────────────────────────

const WorkoutCard = ({
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
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      {workout.exercises.map((ex, i) => (
        <React.Fragment key={ex.id}>
          {i > 0 && <Divider />}
          <ExerciseRow
            ex={ex}
            exerciseCount={workout.exercises.length}
            allExercises={allExercises}
            dispatch={dispatch}
            planId={planId}
          />
        </React.Fragment>
      ))}

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
          {workouts.map((wo) => (
            <WorkoutCard
              key={wo.id}
              workout={wo}
              showDelete={workouts.length > 1}
              allExercises={allExercises}
              dispatch={dispatch}
              planId={statePlan.id}
            />
          ))}

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
