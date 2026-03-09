'use client'

import { useState } from 'react'
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
  const [days, setDays] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { dispatch } = useWorkoutEditorContext()
  const { statePlan } = useNewPlan()

  const canGenerate = !!days && !!goal && !!level

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)

    const inputText = [
      `Create a ${days} days per week ${goal} training plan for a ${level} lifter.`,
      extra.trim() ? `Additional notes: ${extra.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    try {
      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText }),
      })

      const data: { plan?: ParsedPlan; error?: string } = await res.json()

      if (!res.ok || !data.plan) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      const planPrisma = parsedPlanToPlanPrisma(data.plan, statePlan)
      dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: planPrisma })
      onSuccess(planPrisma.weeks.length.toString())
    } catch {
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
    </Box>
  )
}
