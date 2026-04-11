'use client'

import React, { useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import GridOnIcon from '@mui/icons-material/GridOn'
import ViewListIcon from '@mui/icons-material/ViewList'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { useNewPlan } from './useNewPlan'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { savePlan } from '@lib/clientApi'
import { useRouter } from 'next/navigation'
import { Exercise, ExerciseCategory } from '@/generated/prisma/browser'
import type { EnrichedExercise, MatchSuggestion } from '@/app/api/exercises/enrich/route'
import PlanSheetView from '../PlanSheetView'
import PlanWeekView from '../PlanWeekView'
import PlanMultiWeekTable from '../PlanMultiWeekTable'
import { usePlanViewControls } from '../usePlanViewControls'
import { usePlanRepRangeValidation } from '../usePlanRepRangeValidation'
import MuscleHighlight from '@/components/MuscleHighlight'
import {
  EXERCISE_MUSCLES,
  ExerciseMuscle,
  MUSCLE_NAMES,
  PlanPrisma,
  SetPrisma,
  WeekPrisma,
  WorkoutPrisma,
  WorkoutExercisePrisma,
} from '@/types/dataTypes'

const CATEGORY_OPTIONS: ExerciseCategory[] = ['resistance', 'cardio']

function isExerciseMuscle(value: string): value is ExerciseMuscle {
  return (EXERCISE_MUSCLES as readonly string[]).includes(value)
}

function toKnownMuscles(muscles: string[]): ExerciseMuscle[] {
  return muscles.filter(isExerciseMuscle)
}

function formatCategoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function formatMuscleLabel(muscle: string) {
  return isExerciseMuscle(muscle)
    ? MUSCLE_NAMES[muscle]
    : muscle
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function MuscleSection({ label, muscles, color }: { label: string; muscles: string[]; color: 'primary' | 'default' }) {
  if (muscles.length === 0) return null

  return (
    <Box>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {muscles.map((muscle) => (
          <Chip
            key={`${label}-${muscle}`}
            label={formatMuscleLabel(muscle)}
            size="small"
            color={color}
            variant={color === 'primary' ? 'filled' : 'outlined'}
          />
        ))}
      </Box>
    </Box>
  )
}

function cloneSetWithIds(
  set: SetPrisma,
  workoutExerciseId: number,
  nextId: () => number,
  parentIdMap: Map<number, number>,
): SetPrisma {
  const clonedId = nextId()
  parentIdMap.set(set.id, clonedId)
  return {
    ...set,
    id: clonedId,
    workoutExerciseId,
    parentSetId: null,
  }
}

function cloneExerciseForWeek(
  exercise: WorkoutExercisePrisma,
  workoutId: number,
  order: number,
  nextId: () => number,
): WorkoutExercisePrisma {
  const workoutExerciseId = nextId()
  const parentIdMap = new Map<number, number>()
  const clonedSets = exercise.sets.map((set) => cloneSetWithIds(set, workoutExerciseId, nextId, parentIdMap))

  return {
    ...exercise,
    id: workoutExerciseId,
    workoutId,
    order,
    sets: clonedSets.map((set) => ({
      ...set,
      parentSetId: set.parentSetId != null ? (parentIdMap.get(set.parentSetId) ?? null) : null,
    })),
  }
}

function cloneWorkoutForWeek(
  workout: WorkoutPrisma,
  weekId: number,
  order: number,
  nextId: () => number,
): WorkoutPrisma {
  const workoutId = nextId()
  return {
    ...workout,
    id: workoutId,
    weekId,
    order,
    dateCompleted: null,
    exercises: workout.exercises.map((exercise, index) => cloneExerciseForWeek(exercise, workoutId, index + 1, nextId)),
  }
}

function buildTemplateWeekCopies(plan: PlanPrisma, weekCount: number): PlanPrisma {
  const templateWeek = [...plan.weeks].sort((a, b) => a.order - b.order)[0]
  if (!templateWeek) return plan

  let idSeed = -1_000_000
  const nextId = () => idSeed--

  const weeks: WeekPrisma[] = Array.from({ length: Math.max(1, weekCount) }, (_, index) => {
    const weekId = nextId()
    return {
      ...templateWeek,
      id: weekId,
      planId: plan.id,
      order: index + 1,
      workouts: templateWeek.workouts.map((workout, workoutIndex) => cloneWorkoutForWeek(workout, weekId, workoutIndex + 1, nextId)),
    }
  })

  return {
    ...plan,
    weeks,
  }
}

type PlanEditorScreenProps = {
  weekCount: string
  setWeekCount: (v: string) => void
  clientId?: string
  initialViewMode?: 'classic' | 'sheet'
  source?: 'scratch' | 'template' | 'ai' | 'import'
}

export const PlanEditorScreen = ({
  weekCount,
  setWeekCount,
  clientId,
  initialViewMode = 'classic',
  source = 'scratch',
}: PlanEditorScreenProps) => {
  const { statePlan, dispatch } = useNewPlan()
  const { allExercises } = useWorkoutEditorContext()
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [enrichPhase, setEnrichPhase] = useState<'enriching' | 'review' | null>(null)
  const [enrichedExercises, setEnrichedExercises] = useState<EnrichedExercise[]>([])
  const [matchSuggestions, setMatchSuggestions] = useState<Map<string, MatchSuggestion>>(new Map())
  const [editingExerciseName, setEditingExerciseName] = useState<string | null>(null)
  const {
    arrangeMode,
    handleZoomChange,
    setViewMode,
    toggleArrangeMode,
    viewMode,
    zoom,
  } = usePlanViewControls({ defaultViewMode: initialViewMode })
  const {
    repRangeErrors,
    setSaveAttempted,
    visibleRepRangeErrors,
  } = usePlanRepRangeValidation(statePlan)

  const sortedWeeks = [...statePlan.weeks].sort((a, b) => a.order - b.order)
  const usesSingleWeekTemplate = source !== 'import'
  const showsDurationInput = source !== 'import'
  const displayPlan = usesSingleWeekTemplate
    ? {
        ...statePlan,
        weeks: sortedWeeks.length > 0 ? [{ ...sortedWeeks[0], order: 1 }] : statePlan.weeks,
      }
    : statePlan
  const allExercisesNamed = statePlan.weeks.every((week) =>
    week.workouts.every((workout) => workout.exercises.every((exercise) => exercise.exercise.name.trim().length > 0)),
  )
  const canSave = !!statePlan.name.trim() && allExercisesNamed && repRangeErrors.size === 0

  const buildSaveErrorMessage = (error: unknown) => {
    if (typeof error === 'string' && error.trim().length > 0) {
      return `Plan couldn’t be saved: ${error}. Fix the highlighted fields and try again.`
    }
    if (error instanceof Error && error.message.trim().length > 0) {
      return `Plan couldn’t be saved: ${error.message}. Fix the highlighted fields and try again.`
    }
    return 'Plan couldn’t be saved due to an unexpected error. Please try again in a moment.'
  }

  const doSave = async (planToSave: typeof statePlan) => {
    setSaving(true)
    setSaveError(null)
    try {
      const response = await savePlan(planToSave)
      if (response.success) {
        router.push(clientId ? `/user/coach/clients/${clientId}/plans` : `/user/plan/${response.planId}`)
      } else {
        setSaveError(buildSaveErrorMessage(response.error ?? 'The server returned an unknown error'))
      }
    } catch (error) {
      setSaveError(buildSaveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaveAttempted(true)
    if (repRangeErrors.size > 0) {
      setSaveError('Please fix the invalid rep range values before saving.')
      return
    }

    const existingNames = new Set(allExercises.map((exercise) => exercise.name.toLowerCase()))
    const seen = new Set<string>()
    const newExercises: { name: string }[] = []
    let hasMissingMetadata = false

    for (const week of statePlan.weeks) {
      for (const workout of week.workouts) {
        for (const exercise of workout.exercises) {
          const nameLower = exercise.exercise.name.toLowerCase()
          if ((!exercise.exercise.id || exercise.exercise.id <= 0) && !existingNames.has(nameLower) && !seen.has(nameLower)) {
            seen.add(nameLower)
            const hasExerciseMetadata =
              exercise.exercise.category != null
              && (
                exercise.exercise.primaryMuscles.length > 0
                || exercise.exercise.secondaryMuscles.length > 0
                || exercise.exercise.category === 'cardio'
              )

            if (!hasExerciseMetadata) {
              hasMissingMetadata = true
              newExercises.push({ name: exercise.exercise.name })
            }
          }
        }
      }
    }

    const planToPersist = usesSingleWeekTemplate
      ? buildTemplateWeekCopies(statePlan, parseInt(weekCount, 10) || 1)
      : statePlan

    if (!hasMissingMetadata || newExercises.length === 0) {
      return doSave(planToPersist)
    }

    setEnrichPhase('enriching')
    try {
      const res = await fetch('/api/exercises/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises: newExercises }),
      })
      if (!res.ok) {
        setMatchSuggestions(new Map())
        setEnrichPhase(null)
        return doSave(planToPersist)
      }
      const data = await res.json() as { exercises?: EnrichedExercise[]; matchSuggestions?: MatchSuggestion[] }
      setEnrichedExercises(data.exercises ?? [])
      setMatchSuggestions(new Map((data.matchSuggestions ?? []).map((suggestion) => [suggestion.inputName, suggestion])))
      setEditingExerciseName(data.exercises?.[0]?.name ?? null)
      setEnrichPhase('review')
    } catch {
      setMatchSuggestions(new Map())
      setEnrichPhase(null)
      doSave(planToPersist)
    }
  }

  const updateReviewedExercise = (exerciseName: string, updates: Partial<EnrichedExercise>) => {
    setEnrichedExercises((current) =>
      current.map((exercise) => (exercise.name === exerciseName ? { ...exercise, ...updates } : exercise)),
    )
  }

  const handleConfirmEnrich = () => {
    const enrichMap = new Map(enrichedExercises.map((exercise) => [exercise.name, exercise]))
    const enrichedPlan = {
      ...statePlan,
      weeks: statePlan.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((workout) => ({
          ...workout,
          exercises: workout.exercises.map((exercise) => {
            const enrichment = enrichMap.get(exercise.exercise.name)
            if (!enrichment) return exercise
            return {
              ...exercise,
              exercise: {
                ...exercise.exercise,
                category: enrichment.category as Exercise['category'],
                primaryMuscles: enrichment.primaryMuscles,
                secondaryMuscles: enrichment.secondaryMuscles,
              },
            }
          }),
        })),
      })),
    }
    setEditingExerciseName(null)
    setMatchSuggestions(new Map())
    setEnrichPhase(null)
    doSave(enrichedPlan)
  }

  return (
    <>
      <Box sx={{ pb: '80px' }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Plan name"
            value={statePlan.name}
            autoComplete="off"
            onChange={(event) => dispatch({ type: 'UPDATE_PLAN_NAME', planId: statePlan.id, name: event.target.value })}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {showsDurationInput ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="Duration"
                  value={weekCount}
                  inputMode="numeric"
                  size="small"
                  sx={{ width: '4.5em' }}
                  autoComplete="off"
                  onChange={(event) => setWeekCount(event.target.value.replace(/\D/g, ''))}
                />
                <Typography variant="body2" color="text.secondary">
                  weeks
                </Typography>
              </Box>
            ) : (
              <Box />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewMode === 'sheet' && (
                <Tooltip title={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}>
                  <ToggleButton
                    value="arrange"
                    selected={arrangeMode}
                    onChange={toggleArrangeMode}
                    size="small"
                    sx={{ px: 1, py: 0.5, border: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'flex' } }}
                    aria-label={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}
                  >
                    <OpenWithIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              )}

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, next) => {
                  if (next) setViewMode(next)
                }}
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

          {visibleRepRangeErrors.size > 0 && (
            <Alert severity="warning">
              {visibleRepRangeErrors.size === 1
                ? '1 exercise has an invalid rep range. Use formats like 10, 5-10, 5+, or AMRAP.'
                : `${visibleRepRangeErrors.size} exercises have invalid rep ranges. Use formats like 10, 5-10, 5+, or AMRAP.`}
            </Alert>
          )}
        </Box>

        {viewMode === 'sheet' ? (
          <Box sx={{ px: 2, pt: 1, overflow: 'auto' }}>
            <PlanSheetView
              plan={displayPlan}
              planId={statePlan.id}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              arrangeMode={arrangeMode}
              creationMode
              showWeekHeaders={!usesSingleWeekTemplate && sortedWeeks.length > 1}
            />
          </Box>
        ) : (
          <Box sx={{ px: 2, pt: 1 }}>
            {isMobile ? (
              <PlanWeekView
                plan={displayPlan}
                planId={statePlan.id}
                hideWeekNavigationWhenSingleWeek={usesSingleWeekTemplate}
                showProgress={false}
              />
            ) : (
              <PlanMultiWeekTable plan={displayPlan} planId={statePlan.id} creationMode={usesSingleWeekTemplate} />
            )}
          </Box>
        )}
      </Box>

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
        <Button variant="contained" fullWidth size="large" onClick={handleSave} disabled={saving || !canSave}>
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
      </Box>

      <Snackbar open={!!saveError} autoHideDuration={4000} onClose={() => setSaveError(null)}>
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>

      <Dialog
        open={enrichPhase !== null}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown={enrichPhase === 'enriching'}
        onClose={enrichPhase === 'review' ? () => {
          setEditingExerciseName(null)
          setMatchSuggestions(new Map())
          setEnrichPhase(null)
        } : undefined}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: {
              xs: 'min(680px, calc(100dvh - 32px))',
              sm: 'min(760px, calc(100dvh - 48px))',
            },
            m: { xs: 2, sm: 3 },
          },
        }}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'center',
            p: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle>
          {enrichPhase === 'enriching' ? 'Enriching new exercises' : 'Review new exercises'}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto', pb: enrichPhase === 'review' ? 2.5 : 2 }}>
          {enrichPhase === 'enriching' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Analysing {enrichedExercises.length > 0 ? enrichedExercises.length : '…'} exercises…
              </Typography>
            </Box>
          )}
          {enrichPhase === 'review' && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Check each new exercise before saving. You can rename it and adjust the training type or muscle groups here.
              </Typography>

              {enrichedExercises.map((exercise) => {
                const isEditing = editingExerciseName === exercise.name
                const suggestedMatch = matchSuggestions.get(exercise.name)

                return (
                  <Box
                    key={exercise.name}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: isEditing ? 'action.hover' : 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {exercise.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {formatCategoryLabel(exercise.category)}
                        </Typography>
                        {suggestedMatch && suggestedMatch.suggestedName !== exercise.name && (
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            onClick={() => updateReviewedExercise(exercise.name, {
                              name: suggestedMatch.suggestedName,
                              category: suggestedMatch.category,
                              primaryMuscles: suggestedMatch.primaryMuscles,
                              secondaryMuscles: suggestedMatch.secondaryMuscles,
                            })}
                          >
                            Use existing: {suggestedMatch.suggestedName}
                          </Button>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        color={isEditing ? 'primary' : 'default'}
                        onClick={() => setEditingExerciseName(isEditing ? null : exercise.name)}
                        aria-label={isEditing ? `Done editing ${exercise.name}` : `Edit ${exercise.name}`}
                      >
                        {isEditing ? <CheckIcon fontSize="small" /> : <EditOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </Box>

                    <Box
                      sx={{
                        mt: 1.5,
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 112px' },
                        alignItems: 'start',
                      }}
                    >
                      <Stack spacing={1.5}>
                        <MuscleSection label="Primary muscles" muscles={exercise.primaryMuscles} color="primary" />
                        <MuscleSection label="Secondary muscles" muscles={exercise.secondaryMuscles} color="default" />
                      </Stack>

                      <Box
                        sx={{
                          minHeight: 150,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                          p: 1,
                        }}
                      >
                        <MuscleHighlight
                          primaryMuscles={toKnownMuscles(exercise.primaryMuscles)}
                          secondaryMuscles={toKnownMuscles(exercise.secondaryMuscles)}
                          exerciseId={exercise.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)}
                          alwaysShow
                        />
                      </Box>
                    </Box>

                    {isEditing && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            label="Exercise name"
                            value={exercise.name}
                            autoComplete="off"
                            onChange={(event) => updateReviewedExercise(exercise.name, { name: event.target.value })}
                          />

                          <Autocomplete
                            options={CATEGORY_OPTIONS}
                            value={exercise.category}
                            onChange={(_, value) => {
                              if (!value) return
                              updateReviewedExercise(exercise.name, { category: value })
                            }}
                            disableClearable
                            getOptionLabel={formatCategoryLabel}
                            renderInput={(params) => <TextField {...params} label="Training type" />}
                          />

                          <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={[...EXERCISE_MUSCLES]}
                            value={toKnownMuscles(exercise.primaryMuscles)}
                            onChange={(_, value) => updateReviewedExercise(exercise.name, { primaryMuscles: value })}
                            getOptionLabel={(option) => MUSCLE_NAMES[option]}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Primary muscles"
                                helperText="Main muscles this exercise directly trains."
                              />
                            )}
                          />

                          <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={[...EXERCISE_MUSCLES]}
                            value={toKnownMuscles(exercise.secondaryMuscles)}
                            onChange={(_, value) => updateReviewedExercise(exercise.name, { secondaryMuscles: value })}
                            getOptionLabel={(option) => MUSCLE_NAMES[option]}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Secondary muscles"
                                helperText="Supporting or stabilising muscles."
                              />
                            )}
                          />
                        </Stack>
                      </>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        {enrichPhase === 'enriching' && <LinearProgress sx={{ mx: 2, mb: 2, borderRadius: 1 }} />}
        {enrichPhase === 'review' && (
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Button onClick={handleConfirmEnrich} variant="contained" fullWidth disabled={saving}>
              {saving ? 'Saving…' : 'Confirm & Save Plan'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  )
}
