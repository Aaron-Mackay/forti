'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar'
import MuscleHighlight from '@/components/MuscleHighlight'
import { useAppBar } from '@lib/providers/AppBarProvider'
import { ExerciseCategory } from '@/generated/prisma/browser'
import type { AiImportResponse } from '@/app/api/plan/ai-import/route'
import type { MatchSuggestion } from '@/app/api/exercises/enrich/route'
import {
  calculateMuscleVolumes,
  applyReviewedExercisesToPlan,
  countUniqueExercises,
  PendingUploadPlan,
  ReviewedExercise,
} from '@/app/user/plan/upload/uploadFlow'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import {
  EXERCISE_MUSCLES,
  ExerciseMuscle,
  MUSCLE_NAMES,
} from '@/types/dataTypes'
import MuscleVolumeDiagram from './MuscleVolumeDiagram'

const WIZARD_STEPS = ['Upload or paste', 'Review new exercises', 'Summary']
const CATEGORY_OPTIONS: ExerciseCategory[] = ['resistance', 'cardio']

// Mirror of MAX_INPUT_BYTES_SPREADSHEET in src/app/api/plan/ai-import/route.ts
const MAX_INPUT_BYTES = 225_000
const CHUNK_WEEK_GROUP_SIZE = 2
const CHUNK_BYTE_BUDGET = 80_000
const MAX_CHUNK_ATTEMPTS = 3
const CHUNK_REQUEST_TIMEOUT_MS = 330_000

function splitByWeekBlocks(input: string, weeksPerChunk: number): string[] {
  const lines = input.split(/\r?\n/)
  const explicitWeekStarts = lines
    .map((line, i) => (/^\s*WEEK\s+\d+/i.test(line) ? i : -1))
    .filter((i) => i >= 0)

  const sessionRowStarts = lines
    .map((line, i) => (/\bSESSION:\s*/i.test(line) ? i : -1))
    .filter((i) => i >= 0)

  const blockStarts = explicitWeekStarts.length > 1 ? explicitWeekStarts : sessionRowStarts
  if (blockStarts.length <= 1) return [input]

  const weekBlocks = blockStarts.map((start, i) => {
    const endExclusive = blockStarts[i + 1] ?? lines.length
    return lines.slice(start, endExclusive).join('\n').trim()
  }).filter(Boolean)

  const chunks: string[] = []
  for (let i = 0; i < weekBlocks.length; i += weeksPerChunk) {
    chunks.push(weekBlocks.slice(i, i + weeksPerChunk).join('\n\n'))
  }
  return chunks.length > 0 ? chunks : [input]
}

function splitByByteBudget(input: string, byteBudget: number): string[] {
  const lines = input.split(/\r?\n/)
  const chunks: string[] = []
  let current: string[] = []
  let currentBytes = 0

  for (const line of lines) {
    const lineBytes = new TextEncoder().encode(line + '\n').length
    if (current.length > 0 && currentBytes + lineBytes > byteBudget) {
      chunks.push(current.join('\n'))
      current = []
      currentBytes = 0
    }
    current.push(line)
    currentBytes += lineBytes
  }

  if (current.length > 0) chunks.push(current.join('\n'))
  return chunks.length > 0 ? chunks : [input]
}

function buildImportChunks(input: string): string[] {
  const weekChunks = splitByWeekBlocks(input, CHUNK_WEEK_GROUP_SIZE)
  if (weekChunks.length > 1) return weekChunks

  const totalBytes = new TextEncoder().encode(input).length
  if (totalBytes > CHUNK_BYTE_BUDGET) {
    return splitByByteBudget(input, CHUNK_BYTE_BUDGET)
  }
  return [input]
}

function mergeChunkPlans(plans: ParsedPlan[]): ParsedPlan {
  const first = plans[0]
  const mergedWeeks = plans.flatMap((plan) => plan.weeks).map((week, i) => ({ ...week, order: i + 1 }))
  return { ...first, weeks: mergedWeeks }
}

function isExerciseMuscle(value: string): value is ExerciseMuscle {
  return (EXERCISE_MUSCLES as readonly string[]).includes(value)
}

function formatCategoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function exerciseCount(plan: ParsedPlan | null) {
  if (!plan) return 0
  return plan.weeks.reduce((total, week) => total + week.workouts.reduce((sum, workout) => sum + workout.exercises.length, 0), 0)
}

function reviewStepDescription(reviewedExercises: ReviewedExercise[]) {
  if (reviewedExercises.length === 0) return 'No new exercises were detected in this import.'
  if (reviewedExercises.length === 1) return '1 new exercise needs a quick metadata check.'
  return `${reviewedExercises.length} new exercises need a quick metadata check.`
}

export const UploadAndEdit = () => {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [parseIssues, setParseIssues] = useState<string[]>([])
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [importedPlan, setImportedPlan] = useState<ParsedPlan | null>(null)
  const [reviewedExercises, setReviewedExercises] = useState<ReviewedExercise[]>([])
  const [existingExerciseNames, setExistingExerciseNames] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function loadExercises() {
      try {
        const response = await fetch('/api/exercises')
        if (!response.ok) return
        const exercises = await response.json() as Array<{ name: string }>
        if (cancelled) return
        setExistingExerciseNames(new Set(exercises.map((exercise) => exercise.name.toLowerCase())))
      } catch {
        // Ignore: review step can still continue with empty defaults.
      }
    }

    loadExercises()
    return () => { cancelled = true }
  }, [])

  const inputBytes = new TextEncoder().encode(text).length
  const isOverLimit = inputBytes > MAX_INPUT_BYTES
  const loading = phase > 0
  const reviewedPlan = importedPlan ? applyReviewedExercisesToPlan(importedPlan, reviewedExercises) : null
  const muscleVolumes: Partial<Record<ExerciseMuscle, number>> = importedPlan
    ? calculateMuscleVolumes(importedPlan, reviewedExercises)
    : {}
  const sortedMuscleVolumes = Object.entries(muscleVolumes)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 6)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target?.result as string)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    if (isOverLimit) {
      setError(`Input too large — please reduce to under 225 KB (currently ${(inputBytes / 1000).toFixed(1)} KB)`)
      return
    }

    setError(null)
    setParseIssues([])
    setImportedPlan(null)
    setReviewedExercises([])
    setChunkProgress(null)
    setPhase(1)

    await new Promise((resolve) => setTimeout(resolve, 350))
    setPhase(2)

    try {
      const chunks = buildImportChunks(text)
      setChunkProgress({ current: 1, total: chunks.length })
      const importedPlans: ParsedPlan[] = []

      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length })
        let lastError: string | null = null

        for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), CHUNK_REQUEST_TIMEOUT_MS)
          let clarificationAnswers: string[] = []
          let clarificationRounds = 0

          try {
            while (true) {
              const res = await fetch('/api/plan/ai-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  input: chunks[i],
                  type: 'spreadsheet',
                  ...(clarificationAnswers.length > 0 ? { answers: clarificationAnswers } : {}),
                }),
                signal: controller.signal,
              })
              const data: AiImportResponse = await res.json()

              if ('questions' in data) {
                clarificationRounds += 1
                if (clarificationRounds > 2) {
                  lastError = 'Import requires too many clarifications — please simplify and retry.'
                  break
                }

                const answers = data.questions
                  .map((question) => window.prompt(question)?.trim() ?? '')
                  .filter((answer) => answer.length > 0)
                if (answers.length === 0) {
                  lastError = 'Import needs clarification answers to continue.'
                  break
                }

                clarificationAnswers = answers
                continue
              }

              if ('error' in data) {
                lastError = data.error
                if (res.status >= 500 && attempt < MAX_CHUNK_ATTEMPTS) {
                  await new Promise((resolve) => setTimeout(resolve, 600 * attempt))
                  break
                }
                if (data.parseIssues?.length) setParseIssues(data.parseIssues)
                break
              }

              if (!('plan' in data)) {
                lastError = 'Could not parse the spreadsheet — please try again.'
                break
              }

              importedPlans.push(data.plan as ParsedPlan)
              lastError = null
              break
            }

            if (!lastError) break
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              lastError = 'Request timed out while importing — try fewer weeks per upload.'
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
              lastError = 'You appear to be offline — please reconnect and try again.'
            } else {
              lastError = 'Network error — please try again'
            }
            if (attempt < MAX_CHUNK_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, 600 * attempt))
            }
          } finally {
            clearTimeout(timeout)
          }
        }

        if (lastError) {
          setPhase(0)
          setError(lastError)
          setChunkProgress(null)
          return
        }
      }

      if (importedPlans.length === 0) {
        setPhase(0)
        setError('Could not parse the spreadsheet — please try again.')
        setChunkProgress(null)
        return
      }

      const mergedPlan = mergeChunkPlans(importedPlans)
      setImportedPlan(mergedPlan)
      setPhase(3)

      const importedExerciseNames = Array.from(new Set(
        mergedPlan.weeks.flatMap((week) =>
          week.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exercise.name)),
        ),
      ))

      const newExerciseNames = importedExerciseNames.filter(
        (name) => !existingExerciseNames.has(name.toLowerCase()),
      )

      if (newExerciseNames.length === 0) {
        setReviewedExercises([])
        setPhase(0)
        setChunkProgress(null)
        setActiveStep(2)
        return
      }

      const enrichResponse = await fetch('/api/exercises/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises: newExerciseNames.map((name) => ({ name })) }),
      })

      if (!enrichResponse.ok) {
        setReviewedExercises([])
        setPhase(0)
        setChunkProgress(null)
        setError('The plan imported, but new exercise details could not be prefilled. Continue to the editor to review them there.')
        setActiveStep(2)
        return
      }

      const enrichData = await enrichResponse.json() as {
        exercises?: Array<{ name: string; category: ExerciseCategory; primaryMuscles: string[]; secondaryMuscles: string[] }>
        matchSuggestions?: MatchSuggestion[]
      }
      const suggestionsByInput = new Map((enrichData.matchSuggestions ?? []).map((s) => [s.inputName, s]))
      setReviewedExercises(
        (enrichData.exercises ?? []).map((exercise) => {
          const suggestion = suggestionsByInput.get(exercise.name)
          return {
            originalName: exercise.name,
            name: exercise.name,
            category: exercise.category,
            primaryMuscles: exercise.primaryMuscles.filter(isExerciseMuscle),
            secondaryMuscles: exercise.secondaryMuscles.filter(isExerciseMuscle),
            suggestedMatchName: suggestion?.suggestedName,
            suggestedMatchType: suggestion?.matchType,
            suggestedCategory: suggestion?.category,
            suggestedPrimaryMuscles: suggestion?.primaryMuscles.filter(isExerciseMuscle),
            suggestedSecondaryMuscles: suggestion?.secondaryMuscles.filter(isExerciseMuscle),
          }
        }),
      )
      setPhase(0)
      setChunkProgress(null)
      setActiveStep(1)
    } catch {
      setPhase(0)
      setError('Network error — please try again')
      setChunkProgress(null)
    }
  }

  const handleExerciseChange = (originalName: string, updates: Partial<ReviewedExercise>) => {
    setReviewedExercises((current) =>
      current.map((exercise) => (
        exercise.originalName === originalName
          ? { ...exercise, ...updates }
          : exercise
      )),
    )
  }

  const handleContinueToSummary = () => {
    setActiveStep(2)
  }

  const handleContinueToEditor = () => {
    if (!importedPlan) return
    const pendingUploadPlan: PendingUploadPlan = {
      plan: importedPlan,
      reviewedExercises,
    }
    sessionStorage.setItem('pendingUploadPlan', JSON.stringify(pendingUploadPlan))
    router.push('/user/plan/create')
  }

  useAppBar({ title: 'Import from Spreadsheet', showBack: true })

  return (
    <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
        <Stepper alternativeLabel activeStep={activeStep} sx={{ mb: 4 }}>
          {WIZARD_STEPS.map((label, index) => (
            <Step
              key={label}
              completed={index < activeStep || (index === 1 && activeStep === 2 && reviewedExercises.length === 0)}
            >
              <StepLabel optional={index === 1 ? <Typography variant="caption">Only if needed</Typography> : undefined}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Upload or paste your training sheet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bring in a CSV or raw spreadsheet export. Forti will parse the weeks, sessions, and sets, then stop for review before opening the plan editor.
              </Typography>
            </Box>

            <Alert severity="warning">
              AI imports can miss or misread values. Check names, rep schemes, and week-to-week changes before saving the finished plan.
            </Alert>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      Upload CSV file
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {fileName ?? 'No file selected'}
                    </Typography>
                  </Box>

                  <Divider>
                    <Typography variant="body2" color="text.secondary">or</Typography>
                  </Divider>

                  <TextField
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    label="Paste in your training sheet"
                    multiline
                    minRows={10}
                    fullWidth
                    disabled={loading}
                    error={isOverLimit}
                    helperText={
                      text.length > 0
                        ? `${inputBytes.toLocaleString()} / ~225,000 bytes${isOverLimit ? ' — too large' : ''}`
                        : 'Paste a block exactly as exported from your sheet or coaching doc.'
                    }
                  />

                  {(loading || error || parseIssues.length > 0) && (
                    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2 }}>
                      {loading && (
                        <Stack spacing={1.25}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={18} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {phase === 1 && 'Uploading spreadsheet…'}
                              {phase === 2 && 'Analysing your spreadsheet with AI…'}
                              {phase === 3 && 'Preparing review data…'}
                            </Typography>
                          </Box>
                          <LinearProgress />
                          <Typography variant="caption" color="text.secondary">
                            This may take a few minutes for larger sheets.
                            {chunkProgress && chunkProgress.total > 1
                              ? ` Processing part ${chunkProgress.current} of ${chunkProgress.total}.`
                              : ''}
                          </Typography>
                        </Stack>
                      )}

                      {error && !loading && (
                        <Alert severity="error">
                          {error}
                          {parseIssues.length > 0 && (
                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                              {parseIssues.map((issue, index) => (
                                <li key={index}>
                                  <Typography variant="caption">{issue}</Typography>
                                </li>
                              ))}
                            </Box>
                          )}
                        </Alert>
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading || !text.trim()}
                      endIcon={<ArrowForwardIcon />}
                    >
                      Analyse import
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {activeStep === 1 && importedPlan && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Review new exercises
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reviewStepDescription(reviewedExercises)}
              </Typography>
            </Box>

            {reviewedExercises.length === 0 ? (
              <Alert severity="info">Every exercise in this import already exists in your library. You can skip straight to the summary.</Alert>
            ) : (
              <Stack spacing={2}>
                {reviewedExercises.map((exercise) => (
                  <Card key={exercise.originalName} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gap: 2,
                          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 180px' },
                          alignItems: 'start',
                        }}
                      >
                        <Stack spacing={2}>
                          <TextField
                            label="Exercise name"
                            value={exercise.name}
                            autoComplete="off"
                            onChange={(event) => handleExerciseChange(exercise.originalName, { name: event.target.value })}
                          />

                          {exercise.suggestedMatchName && exercise.suggestedMatchName !== exercise.name && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleExerciseChange(exercise.originalName, {
                                name: exercise.suggestedMatchName,
                                category: exercise.suggestedCategory ?? exercise.category,
                                primaryMuscles: exercise.suggestedPrimaryMuscles ?? exercise.primaryMuscles,
                                secondaryMuscles: exercise.suggestedSecondaryMuscles ?? exercise.secondaryMuscles,
                              })}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              Use existing: {exercise.suggestedMatchName}
                            </Button>
                          )}

                          <Autocomplete
                            options={CATEGORY_OPTIONS}
                            value={exercise.category}
                            onChange={(_, value) => {
                              if (!value) return
                              handleExerciseChange(exercise.originalName, { category: value })
                            }}
                            disableClearable
                            getOptionLabel={formatCategoryLabel}
                            renderInput={(params) => <TextField {...params} label="Training type" />}
                          />

                          <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={[...EXERCISE_MUSCLES]}
                            value={exercise.primaryMuscles}
                            onChange={(_, value) => handleExerciseChange(exercise.originalName, { primaryMuscles: value })}
                            getOptionLabel={(option) => MUSCLE_NAMES[option]}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Primary muscles"
                                helperText="Main muscles this exercise is intended to train."
                              />
                            )}
                          />

                          <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={[...EXERCISE_MUSCLES]}
                            value={exercise.secondaryMuscles}
                            onChange={(_, value) => handleExerciseChange(exercise.originalName, { secondaryMuscles: value })}
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

                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              minHeight: 220,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.default',
                              p: 1.5,
                            }}
                          >
                            <MuscleHighlight
                              primaryMuscles={exercise.primaryMuscles}
                              secondaryMuscles={exercise.secondaryMuscles}
                              exerciseId={Number(exercise.originalName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))}
                              alwaysShow
                            />
                          </Box>

                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
                              Primary muscles
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.map((muscle) => (
                                <Chip key={`${exercise.originalName}-${muscle}`} label={MUSCLE_NAMES[muscle]} size="small" color="primary" />
                              )) : (
                                <Typography variant="caption" color="text.secondary">No primary muscles selected yet.</Typography>
                              )}
                            </Box>
                          </Box>

                          {exercise.secondaryMuscles.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
                                Secondary muscles
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {exercise.secondaryMuscles.map((muscle) => (
                                  <Chip key={`${exercise.originalName}-secondary-${muscle}`} label={MUSCLE_NAMES[muscle]} size="small" variant="outlined" />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button onClick={() => setActiveStep(0)} startIcon={<ArrowBackIcon />}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleContinueToSummary}
                endIcon={<ArrowForwardIcon />}
              >
                Continue to summary
              </Button>
            </Box>
          </Stack>
        )}

        {activeStep === 2 && reviewedPlan && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Summary before the editor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sanity-check the structure and muscle balance before opening the full plan editor.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              }}
            >
              {[
                { label: 'Weeks', value: reviewedPlan.weeks.length },
                { label: 'Workouts', value: reviewedPlan.weeks.reduce((sum, week) => sum + week.workouts.length, 0) },
                { label: 'Exercises', value: exerciseCount(reviewedPlan) },
                { label: 'New exercises', value: reviewedExercises.length },
              ].map((item) => (
                <Card key={item.label} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>{item.value}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' } }}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Plan structure
                  </Typography>
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      Plan name: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{reviewedPlan.name}</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique exercises: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{countUniqueExercises(reviewedPlan)}</Box>
                    </Typography>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        Workouts per week
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {reviewedPlan.weeks.map((week) => (
                          <Chip
                            key={week.order}
                            label={`Week ${week.order}: ${week.workouts.length}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                    <Alert severity="info" icon={<CheckCircleIcon fontSize="inherit" />}>
                      {reviewedExercises.length > 0
                        ? `${reviewedExercises.length} new exercises will be carried into the editor with the metadata you just reviewed.`
                        : 'No new exercises were introduced by this import, so the editor can focus on plan structure and set details.'}
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Muscle balance
                  </Typography>
                  <MuscleVolumeDiagram volumes={muscleVolumes} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 1 }}>
                    Estimated weekly volume uses working set count, with full credit for primary muscles and half credit for secondary muscles.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {sortedMuscleVolumes.length > 0 ? sortedMuscleVolumes.map(([muscle, volume]) => (
                      <Chip
                        key={muscle}
                        label={`${MUSCLE_NAMES[muscle as ExerciseMuscle]} ${(volume ?? 0).toFixed(1)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        Muscle volume becomes available once new exercises have muscle data.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button
                onClick={() => setActiveStep(reviewedExercises.length > 0 ? 1 : 0)}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleContinueToEditor}
                endIcon={<ArrowForwardIcon />}
              >
                Continue to editor
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
