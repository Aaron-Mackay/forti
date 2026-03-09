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
import type { ParsedPlan } from '@/utils/aiPlanParser'

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

  const handleGenerate = async () => {
    if (!canGenerate) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const inputText =
      mode === 'guided'
        ? [
            `Create a ${days} days per week ${goal} training plan for a ${level} lifter.`,
            extra.trim() ? `Additional notes: ${extra.trim()}` : '',
          ]
            .filter(Boolean)
            .join(' ')
        : freeformText.trim()

    try {
      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText }),
        signal: controller.signal,
      })

      const data: { plan?: ParsedPlan; error?: string } = await res.json()

      if (!res.ok || !data.plan) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      const planPrisma = parsedPlanToPlanPrisma(data.plan, statePlan)
      dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: planPrisma })
      onSuccess(planPrisma.weeks.length.toString())
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
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
