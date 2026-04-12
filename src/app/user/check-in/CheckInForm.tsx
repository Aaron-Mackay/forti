'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRouter } from 'next/navigation';
import type { Metric, WeeklyCheckIn } from '@/generated/prisma/browser';
import MetricsSummaryTable from './MetricsSummaryTable';
import RatingField from './RatingField';
import ProgressPhotoSection from './ProgressPhotoSection';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';
import type { PreviousPhotos, WeekTargets } from '@/types/checkInTypes';

interface Props {
  currentWeek: Metric[];
  weekPrior: Metric[];
  checkIn: WeeklyCheckIn;
  previousPhotos: PreviousPhotos | null;
  weekTargets: WeekTargets | null;
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  activePlanId: number | null;
  onSubmitted: () => void;
}

interface FormState {
  energyLevel: number | null;
  moodRating: number | null;
  stressLevel: number | null;
  sleepQuality: number | null;
  recoveryRating: number | null;
  adherenceRating: number | null;
  weekReview: string;
  coachMessage: string;
  goalsNextWeek: string;
}

export default function CheckInForm({ currentWeek, weekPrior, checkIn, previousPhotos, weekTargets, completedWorkoutsCount, plannedWorkoutsCount, activePlanId, onSubmitted }: Props) {
  const router = useRouter();
  const isEditing = Boolean(checkIn.completedAt);
  const [photoUrls, setPhotoUrls] = useState<{ front: string | null; back: string | null; side: string | null }>({
    front: checkIn.frontPhotoUrl ?? null,
    back: checkIn.backPhotoUrl ?? null,
    side: checkIn.sidePhotoUrl ?? null,
  });
  const [form, setForm] = useState<FormState>({
    energyLevel: checkIn.energyLevel,
    moodRating: checkIn.moodRating,
    stressLevel: checkIn.stressLevel,
    sleepQuality: checkIn.sleepQuality,
    recoveryRating: checkIn.recoveryRating,
    adherenceRating: checkIn.adherenceRating,
    weekReview: checkIn.weekReview ?? '',
    coachMessage: checkIn.coachMessage ?? '',
    goalsNextWeek: checkIn.goalsNextWeek ?? '',
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
        completedWorkouts: completedWorkoutsCount,
        plannedWorkouts: plannedWorkoutsCount,
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
      if (!isEditing) {
        trackFirstWeekEvent('first_checkin_submitted', { source: 'check-in' });
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const workoutClickable = completedWorkoutsCount > 0 && activePlanId !== null;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Progress photos — first section */}
      <ProgressPhotoSection
        currentPhotos={photoUrls}
        previousPhotos={previousPhotos}
        weekStart={new Date(checkIn.weekStartDate).toISOString()}
        onPhotoUploaded={(angle, url) => setPhotoUrls(p => ({ ...p, [angle]: url }))}
        onPhotoRemoved={(angle) => setPhotoUrls(p => ({ ...p, [angle]: null }))}
      />

      <Divider sx={{ my: 3 }} />

      {/* Metrics summary + workout count */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Last 2 weeks of metrics</Typography>
      <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets} />

      {/* Workout completed/planned row */}
      <Box
        onClick={workoutClickable ? () => router.push(`/user/plan/${activePlanId}`) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 1.5,
          px: 1,
          py: 0.75,
          borderRadius: 1,
          bgcolor: 'action.hover',
          cursor: workoutClickable ? 'pointer' : 'default',
          ...(workoutClickable && { '&:hover': { bgcolor: 'action.selected' } }),
        }}
      >
        <Typography variant="body2" color="text.secondary">Workouts</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {completedWorkoutsCount}/{plannedWorkoutsCount}
          </Typography>
          {workoutClickable && <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        </Box>
      </Box>

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
        label="Goals / focus for next week"
        multiline
        minRows={2}
        fullWidth
        value={form.goalsNextWeek}
        onChange={e => setForm(f => ({ ...f, goalsNextWeek: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Message to your coach (optional)"
        multiline
        minRows={2}
        fullWidth
        value={form.coachMessage}
        onChange={e => setForm(f => ({ ...f, coachMessage: e.target.value }))}
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
        {isEditing ? 'Resubmit Check-in' : 'Submit Check-in'}
      </Button>
    </Box>
  );
}
