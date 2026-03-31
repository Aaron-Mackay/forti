'use client'

import React, { useCallback, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import GridOnIcon from '@mui/icons-material/GridOn'
import ViewListIcon from '@mui/icons-material/ViewList'
import OpenWithIcon from '@mui/icons-material/OpenWith'
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
import type { EnrichedExercise } from '@/app/api/exercises/enrich/route'
import { ActionDispatch } from 'react'
import { WorkoutEditorAction } from '@lib/useWorkoutEditor'
import { AddExerciseForm } from '@/app/exercises/AddExerciseForm'
import { createFilterOptions } from '@mui/material/Autocomplete'
import type { FilterOptionsState } from '@mui/material'
import PlanSheetView from '../PlanSheetView'

// ── Autocomplete helpers ───────────────────────────────────────────────────────

const CREATE_PREFIX = '__create__:'
const _baseFilter = createFilterOptions<string>()
const exerciseFilterOptions = (options: string[], params: FilterOptionsState<string>) => {
  const filtered = _baseFilter(options, params)
  const { inputValue } = params
  if (inputValue.trim().length > 0 && !options.some(o => o.toLowerCase() === inputValue.toLowerCase())) {
    filtered.push(`${CREATE_PREFIX}${inputValue}`)
  }
  return filtered
}

// ── Sortable exercise row ──────────────────────────────────────────────────────

const SortableExerciseRow = ({
  ex,
  exerciseCount,
  allExercises,
  addExercise,
  dispatch,
  planId,
}: {
  ex: WorkoutExercisePrisma
  exerciseCount: number
  allExercises: Exercise[]
  addExercise: (exercise: Exercise) => void
  dispatch: ActionDispatch<[WorkoutEditorAction]>
  planId: number
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ex.id,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const regularSets = ex.sets.filter(s => !s.isDropSet);
  const firstRegular = regularSets[0];
  const dropsPerSet = firstRegular
    ? ex.sets.filter(s => s.isDropSet && s.parentSetId === firstRegular.id).length
    : 0;

  const inputValue = ex.exercise.name

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton size="small" sx={{ cursor: 'grab', touchAction: 'none', color: 'text.disabled' }} {...attributes} {...listeners}>
          <DragHandleIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Autocomplete
            freeSolo
            size="small"
            options={allExercises.map((e) => e.name)}
            inputValue={inputValue}
            filterOptions={exerciseFilterOptions}
            getOptionLabel={(option) =>
              option.startsWith(CREATE_PREFIX) ? option.slice(CREATE_PREFIX.length) : option
            }
            renderOption={({ key, ...optionProps }, option) =>
              option.startsWith(CREATE_PREFIX) ? (
                <li key={key} {...optionProps}>
                  <em>+ Create &quot;{option.slice(CREATE_PREFIX.length)}&quot;</em>
                </li>
              ) : (
                <li key={key} {...optionProps}>{option}</li>
              )
            }
            onChange={(_, newValue) => {
              if (typeof newValue === 'string' && newValue.startsWith(CREATE_PREFIX)) {
                setCreateOpen(true)
              }
            }}
            onInputChange={(_, newValue) => {
              if (newValue.startsWith(CREATE_PREFIX)) return
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
        </Box>
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
      <AddExerciseForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialName={inputValue}
        onExerciseAdded={(newExercise) => {
          addExercise(newExercise)
          dispatch({
            type: 'UPDATE_EXERCISE',
            planId,
            weekId: PLACEHOLDER_ID,
            workoutId: ex.workoutId,
            workoutExerciseId: ex.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            category: (ex.exercise.category ?? 'resistance') as any,
            exerciseName: newExercise.name,
            exercises: [...allExercises, newExercise],
          })
          setCreateOpen(false)
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, pl: '40px' }}>
        <TextField
          size="small"
          sx={{ flex: 1 }}
          label="Sets"
          value={regularSets.length}
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
          label="Drops"
          value={dropsPerSet}
          autoComplete="off"
          inputMode="numeric"
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) =>
            dispatch({
              type: 'SET_DROPS_PER_SET',
              planId,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
              exerciseId: ex.id,
              dropCount: Math.max(0, parseInt(e.target.value) || 0),
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
  addExercise,
  dispatch,
  planId,
}: {
  workout: WorkoutPrisma
  showDelete: boolean
  allExercises: Exercise[]
  addExercise: (exercise: Exercise) => void
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
                addExercise={addExercise}
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
  clientId?: string
}

export const PlanEditorScreen = ({ weekCount, setWeekCount, clientId }: PlanEditorScreenProps) => {
  const { statePlan, dispatch } = useNewPlan()
  const { allExercises, addExercise } = useWorkoutEditorContext()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [enrichPhase, setEnrichPhase] = useState<'enriching' | 'review' | null>(null)
  const [enrichedExercises, setEnrichedExercises] = useState<EnrichedExercise[]>([])
  const [viewMode, setViewMode] = useState<'classic' | 'sheet'>('classic')
  const [arrangeMode, setArrangeMode] = useState(false)
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 1
    const v = parseFloat(localStorage.getItem('sheetZoom') ?? '')
    return isNaN(v) ? 1 : Math.max(0.25, Math.min(1, v))
  })

  const handleZoomChange = useCallback((newZoom: number) => {
    const rounded = Math.round(newZoom * 100) / 100
    setZoom(rounded)
    localStorage.setItem('sheetZoom', String(rounded))
  }, [])

  const workouts = statePlan.weeks[0].workouts

  const allExercisesNamed = statePlan.weeks[0].workouts.every(wo =>
    wo.exercises.every(ex => ex.exercise.name.trim().length > 0)
  )
  const canSave = !!statePlan.name.trim() && allExercisesNamed

  const doSave = async (planToSave: typeof statePlan) => {
    setSaving(true)
    setSaveError(null)
    try {
      const response = await savePlan(planToSave)
      if (response.success) {
        router.push(clientId
          ? `/user/coach/clients/${clientId}/plans`
          : `/user/plan/${response.planId}`
        )
      } else {
        setSaveError(response.error || 'Failed to save plan. Please try again.')
      }
    } catch {
      setSaveError('Failed to save plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    // Detect exercises not yet in the database — negative placeholder ID AND not already in the global list
    const existingNames = new Set(allExercises.map((e) => e.name.toLowerCase()))
    const seen = new Set<string>()
    const newExercises: { name: string }[] = []
    for (const wo of statePlan.weeks[0].workouts) {
      for (const ex of wo.exercises) {
        const nameLower = ex.exercise.name.toLowerCase()
        if (
          (!ex.exercise.id || ex.exercise.id <= 0) &&
          !existingNames.has(nameLower) &&
          !seen.has(nameLower)
        ) {
          seen.add(nameLower)
          newExercises.push({ name: ex.exercise.name })
        }
      }
    }

    if (newExercises.length === 0) {
      return doSave(statePlan)
    }

    setEnrichPhase('enriching')
    try {
      const res = await fetch('/api/exercises/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises: newExercises }),
      })
      if (!res.ok) {
        // Non-blocking: fall back to saving without enrichment
        setEnrichPhase(null)
        return doSave(statePlan)
      }
      const data = await res.json()
      setEnrichedExercises(data.exercises ?? [])
      setEnrichPhase('review')
    } catch {
      // Non-blocking: fall back to saving without enrichment
      setEnrichPhase(null)
      doSave(statePlan)
    }
  }

  const handleConfirmEnrich = () => {
    // Merge enriched data into plan exercises before saving
    const enrichMap = new Map(enrichedExercises.map((e) => [e.name, e]))
    const enrichedPlan = {
      ...statePlan,
      weeks: statePlan.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((wo) => ({
          ...wo,
          exercises: wo.exercises.map((ex) => {
            const enrichment = enrichMap.get(ex.exercise.name)
            if (!enrichment) return ex
            return {
              ...ex,
              exercise: {
                ...ex.exercise,
                category: enrichment.category as Exercise['category'],
                primaryMuscles: enrichment.primaryMuscles,
                secondaryMuscles: enrichment.secondaryMuscles,
              },
            }
          }),
        })),
      })),
    }
    setEnrichPhase(null)
    doSave(enrichedPlan)
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

            <Box sx={{ flex: 1 }} />

            {/* Arrange toggle — sheet mode, desktop only */}
            {viewMode === 'sheet' && (
              <Tooltip title={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}>
                <ToggleButton
                  value="arrange"
                  selected={arrangeMode}
                  onChange={() => setArrangeMode(v => !v)}
                  size="small"
                  sx={{ px: 1, py: 0.5, border: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'flex' } }}
                  aria-label={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}
                >
                  <OpenWithIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            )}

            {/* View toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next) => { if (next) { setViewMode(next); if (next === 'classic') setArrangeMode(false) } }}
              size="small"
              aria-label="plan view mode"
            >
              <Tooltip title="Classic view">
                <ToggleButton value="classic" aria-label="classic view" sx={{ px: 1, py: 0.5 }}>
                  <ViewListIcon fontSize="small" />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.75, fontSize: '0.7rem' }}>Classic</Box>
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Sheet view">
                <ToggleButton value="sheet" aria-label="sheet view" sx={{ px: 1, py: 0.5 }}>
                  <GridOnIcon fontSize="small" />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.75, fontSize: '0.7rem' }}>Sheet</Box>
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {viewMode === 'sheet' ? (
          <Box sx={{ px: 2, pt: 1, overflow: 'auto' }}>
            <PlanSheetView
              plan={statePlan}
              planId={statePlan.id}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              arrangeMode={arrangeMode}
              creationMode
            />
          </Box>
        ) : (
          <>
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
                      addExercise={addExercise}
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
          </>
        )}
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

      {/* Exercise enrichment modal — container offset keeps it below the AppBar */}
      <Dialog
        open={enrichPhase !== null}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown={enrichPhase === 'enriching'}
        onClose={enrichPhase === 'review' ? () => setEnrichPhase(null) : undefined}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            pt: { xs: '56px', sm: '64px' },
          },
        }}
      >
        <DialogTitle>
          {enrichPhase === 'enriching' ? 'Enriching new exercises' : 'Review new exercises'}
        </DialogTitle>
        <DialogContent>
          {enrichPhase === 'enriching' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Analysing {enrichedExercises.length > 0 ? enrichedExercises.length : '…'} exercises…
              </Typography>
            </Box>
          )}
          {enrichPhase === 'review' && (
            <List disablePadding>
              {enrichedExercises.map((ex, i) => (
                <React.Fragment key={ex.name}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemText
                      primary={ex.name}
                      secondary={[
                        `${ex.category.charAt(0).toUpperCase() + ex.category.slice(1)}`,
                        ex.primaryMuscles.length > 0 ? ex.primaryMuscles.join(', ') : null,
                        ex.secondaryMuscles.length > 0
                          ? `+ ${ex.secondaryMuscles.join(', ')}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        {enrichPhase === 'enriching' && (
          <LinearProgress sx={{ mx: 2, mb: 2, borderRadius: 1 }} />
        )}
        {enrichPhase === 'review' && (
          <DialogActions>
            <Button onClick={handleConfirmEnrich} variant="contained" fullWidth disabled={saving}>
              {saving ? 'Saving…' : 'Confirm & Save Plan'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  )
}
