'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import type { DayMetric } from '@prisma/client';
import MetricsSummaryTable from './MetricsSummaryTable';
import RatingField from './RatingField';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';

interface Props {
  currentWeek: DayMetric[];
  weekPrior: DayMetric[];
  onSubmitted: () => void;
}

interface FormState {
  energyLevel: number | null;
  moodRating: number | null;
  stressLevel: number | null;
  sleepQuality: number | null;
  recoveryRating: number | null;
  adherenceRating: number | null;
  completedWorkouts: string;
  plannedWorkouts: string;
  weekReview: string;
  coachMessage: string;
  goalsNextWeek: string;
}

export default function CheckInForm({ currentWeek, weekPrior, onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>({
    energyLevel: null,
    moodRating: null,
    stressLevel: null,
    sleepQuality: null,
    recoveryRating: null,
    adherenceRating: null,
    completedWorkouts: '',
    plannedWorkouts: '',
    weekReview: '',
    coachMessage: '',
    goalsNextWeek: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRating(key: keyof FormState) {
    return (val: number) => setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        ...form,
        completedWorkouts: form.completedWorkouts !== '' ? parseInt(form.completedWorkouts) : undefined,
        plannedWorkouts: form.plannedWorkouts !== '' ? parseInt(form.plannedWorkouts) : undefined,
        energyLevel: form.energyLevel ?? undefined,
        moodRating: form.moodRating ?? undefined,
        stressLevel: form.stressLevel ?? undefined,
        sleepQuality: form.sleepQuality ?? undefined,
        recoveryRating: form.recoveryRating ?? undefined,
        adherenceRating: form.adherenceRating ?? undefined,
        weekReview: form.weekReview || undefined,
        coachMessage: form.coachMessage || undefined,
        goalsNextWeek: form.goalsNextWeek || undefined,
      };
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Submission failed');
      }
      trackFirstWeekEvent('first_checkin_submitted', { source: 'check-in' });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Metrics summary */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Last 2 weeks of metrics</Typography>
      <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} />

      <Divider sx={{ my: 3 }} />

      {/* Subjective ratings */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>How was your week?</Typography>
      <RatingField label="Energy level" value={form.energyLevel} onChange={setRating('energyLevel')} />
      <RatingField label="Mood / Motivation" value={form.moodRating} onChange={setRating('moodRating')} />
      <RatingField label="Stress level" value={form.stressLevel} onChange={setRating('stressLevel')} />
      <RatingField label="Sleep quality (subjective)" value={form.sleepQuality} onChange={setRating('sleepQuality')} />
      <RatingField label="Recovery between sessions" value={form.recoveryRating} onChange={setRating('recoveryRating')} />
      <RatingField label="Adherence to plan" value={form.adherenceRating} onChange={setRating('adherenceRating')} />

      <Divider sx={{ my: 3 }} />

      {/* Training counts */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Training this week</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Workouts planned"
          type="number"
          size="small"
          value={form.plannedWorkouts}
          onChange={e => setForm(f => ({ ...f, plannedWorkouts: e.target.value }))}
          slotProps={{ htmlInput: { min: 0, max: 99 } }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Workouts completed"
          type="number"
          size="small"
          value={form.completedWorkouts}
          onChange={e => setForm(f => ({ ...f, completedWorkouts: e.target.value }))}
          slotProps={{ htmlInput: { min: 0, max: 99 } }}
          sx={{ flex: 1 }}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Free text */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Reflection</Typography>
      <TextField
        label="How did your week go overall?"
        multiline
        minRows={3}
        fullWidth
        value={form.weekReview}
        onChange={e => setForm(f => ({ ...f, weekReview: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Message to your coach (optional)"
        multiline
        minRows={2}
        fullWidth
        value={form.coachMessage}
        onChange={e => setForm(f => ({ ...f, coachMessage: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Goals / focus for next week"
        multiline
        minRows={2}
        fullWidth
        value={form.goalsNextWeek}
        onChange={e => setForm(f => ({ ...f, goalsNextWeek: e.target.value }))}
        sx={{ mb: 3 }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={handleSubmit}
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        size="large"
      >
        Submit Check-in
      </Button>
    </Box>
  );
}
