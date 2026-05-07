'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { useNewPlan } from './useNewPlan'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import { parsedPlanToPlanPrisma } from './planConverter'
import type { AiImportResponse } from '@lib/contracts/aiImport'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = ['3', '4', '5', '6']
const GOAL_OPTIONS = ['Strength', 'Muscle', 'Fat Loss', 'General Fitness']
const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced']

// ── Component ─────────────────────────────────────────────────────────────────

type AiFormScreenProps = {
  onSuccess: (weekCount: string) => void
}

export const AiFormScreen = ({ onSuccess }: AiFormScreenProps) => {
  const [mode, setMode] = useState<'guided' | 'freeform'>('guided')

  // Guided mode state
  const [days, setDays] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [extra, setExtra] = useState('')

  // Freeform mode state
  const [freeformText, setFreeformText] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clarifying questions state
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<string[]>([])

  const { dispatch } = useWorkoutEditorContext()
  const { statePlan } = useNewPlan()

  // Abort in-flight fetch when the user navigates away
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const canGenerate =
    mode === 'guided' ? !!days && !!goal && !!level : freeformText.trim().length > 0

  const buildInputText = () =>
    mode === 'guided'
      ? [
          `Create a ${days} days per week ${goal} training plan for a ${level} lifter.`,
          extra.trim() ? `Additional notes: ${extra.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' ')
      : freeformText.trim()

  const submitToApi = async (inputText: string, answersToSend: string[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { input: inputText }
      if (answersToSend.length > 0) body.answers = answersToSend

      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const data: AiImportResponse = await res.json()

      if (!res.ok) {
        setError(('error' in data ? data.error : null) ?? 'Something went wrong. Please try again.')
        return
      }

      if ('questions' in data) {
        setQuestions(data.questions)
        setAnswers(data.questions.map(() => ''))
        return
      }

      if ('plan' in data) {
        const planPrisma = parsedPlanToPlanPrisma(data.plan, statePlan)
        dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: planPrisma })
        onSuccess(planPrisma.weeks.length.toString())
        return
      }

      setError('Something went wrong. Please try again.')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (!canGenerate) return
    setQuestions(null)
    setAnswers([])
    submitToApi(buildInputText(), [])
  }

  const handleAnswerSubmit = () => {
    submitToApi(buildInputText(), answers)
  }

  if (loading) {
    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          mt: 4,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Typography variant="h6">Building your plan…</Typography>
        <LinearProgress sx={{ width: '100%' }} />
        <Typography variant="body2" color="text.secondary">
          Selecting exercises and structuring your week
        </Typography>
      </Box>
    )
  }

  // ── Clarifying questions ──────────────────────────────────────────────────────

  if (questions) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            A few quick questions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Answer these so we can build your plan accurately.
          </Typography>
        </Box>

        {questions.map((q, i) => (
          <Box key={i}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              {i + 1}. {q}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Your answer"
              value={answers[i] ?? ''}
              onChange={(e) => setAnswers(prev => { const next = [...prev]; next[i] = e.target.value; return next; })}
              inputProps={{ 'aria-label': `Answer to question ${i + 1}` }}
            />
          </Box>
        ))}

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { setQuestions(null); setAnswers([]); }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAnswerSubmit}
            disabled={answers.some(a => !a.trim())}
            sx={{ flex: 1 }}
          >
            Build my plan
          </Button>
        </Box>
      </Box>
    )
  }

  // ── Freeform mode ────────────────────────────────────────────────────────────

  if (mode === 'freeform') {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Button
          variant="text"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => setMode('guided')}
        >
          ← Use guided setup instead
        </Button>

        <Box>
          <Typography variant="h6" fontWeight={600}>
            Describe your plan
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Paste a training programme, describe your goals, or outline exercises and
            sets — AI will structure it into a plan for you.
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={8}
          placeholder={
            'e.g. "3 day push/pull/legs, bench press 4×8-12, row 4×6-8, squat 4×5, no barbells, 45 min sessions"'
          }
          value={freeformText}
          onChange={(e) => setFreeformText(e.target.value)}
          inputProps={{ 'aria-label': 'Plan description' }}
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          size="large"
          disabled={!canGenerate}
          startIcon={<AutoAwesomeIcon />}
          onClick={handleGenerate}
        >
          Generate my plan
        </Button>
      </Box>
    )
  }

  // ── Guided mode ──────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" fontWeight={600}>
        Tell us about your goals
      </Typography>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          How many days per week?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {DAYS_OPTIONS.map((d) => (
            <Chip
              key={d}
              label={`${d} days`}
              onClick={() => setDays(d)}
              color={days === d ? 'primary' : 'default'}
              variant={days === d ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Main goal?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {GOAL_OPTIONS.map((g) => (
            <Chip
              key={g}
              label={g}
              onClick={() => setGoal(g)}
              color={goal === g ? 'primary' : 'default'}
              variant={goal === g ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Experience level?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {LEVEL_OPTIONS.map((l) => (
            <Chip
              key={l}
              label={l}
              onClick={() => setLevel(l)}
              color={level === l ? 'primary' : 'default'}
              variant={level === l ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Anything else? (optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder='e.g. "no barbell", "focus on upper body", "home gym only"'
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          inputProps={{ 'aria-label': 'Additional notes' }}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        size="large"
        disabled={!canGenerate}
        startIcon={<AutoAwesomeIcon />}
        onClick={handleGenerate}
      >
        Generate my plan
      </Button>

      <Button
        variant="text"
        size="small"
        onClick={() => setMode('freeform')}
      >
        Prefer to describe your own plan?
      </Button>
    </Box>
  )
}
