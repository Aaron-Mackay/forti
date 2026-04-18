'use client';

import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRouter } from 'next/navigation';
import type { Metric, WeeklyCheckIn } from '@/generated/prisma/browser';
import MetricsSummaryTable from '@/components/MetricsSummaryTable';
import { useSettings } from '@lib/providers/SettingsProvider';
import RatingField from './RatingField';
import ProgressPhotoSection from './ProgressPhotoSection';
import CheckInCustomCard from '@/components/CheckInCustomCard';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';
import type { PreviousPhotos, WeekTargets } from '@/types/checkInTypes';
import type { CheckInTemplate, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import { parseCustomResponses, isFieldVisible, getAllInputFields } from '@/types/checkInTemplateTypes';

interface Props {
  currentWeek: Metric[];
  weekPrior: Metric[];
  checkIn: WeeklyCheckIn;
  previousPhotos: PreviousPhotos | null;
  weekTargets: WeekTargets | null;
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  activePlanId: number | null;
  template: CheckInTemplate | null;
  onSubmitted: () => void;
}

// ─── Legacy mode state ───────────────────────────────────────────────────────

interface LegacyFormState {
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

export default function CheckInForm({
  currentWeek, weekPrior, checkIn, previousPhotos, weekTargets,
  completedWorkoutsCount, plannedWorkoutsCount, activePlanId,
  template, onSubmitted,
}: Props) {
  const router = useRouter();
  const { settings } = useSettings();
  const isEditing = Boolean(checkIn.completedAt);
  const activeTemplate = template ?? null;

  const [photoUrls, setPhotoUrls] = useState<{ front: string | null; back: string | null; side: string | null }>({
    front: checkIn.frontPhotoUrl ?? null,
    back: checkIn.backPhotoUrl ?? null,
    side: checkIn.sidePhotoUrl ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Template mode state ────────────────────────────────────────────────────
  const [customResponses, setCustomResponses] = useState<CustomCheckInResponses>(() =>
    parseCustomResponses(checkIn.customResponses)
  );

  // ── Legacy mode state ──────────────────────────────────────────────────────
  const [legacyForm, setLegacyForm] = useState<LegacyFormState>({
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

  function setLegacyRating(key: keyof LegacyFormState) {
    return (val: number) => setLegacyForm(f => ({ ...f, [key]: val }));
  }

  function setCustomField(fieldId: string, value: string | number | null) {
    setCustomResponses(r => ({ ...r, [fieldId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let body: Record<string, unknown>;

      if (activeTemplate !== null) {
        // Template mode: send customResponses
        body = {
          customResponses,
          completedWorkouts: completedWorkoutsCount,
          plannedWorkouts: plannedWorkoutsCount,
        };
      } else {
        // Legacy mode: send fixed fields
        body = {
          ...legacyForm,
          completedWorkouts: completedWorkoutsCount,
          plannedWorkouts: plannedWorkoutsCount,
          energyLevel: legacyForm.energyLevel ?? undefined,
          moodRating: legacyForm.moodRating ?? undefined,
          stressLevel: legacyForm.stressLevel ?? undefined,
          sleepQuality: legacyForm.sleepQuality ?? undefined,
          recoveryRating: legacyForm.recoveryRating ?? undefined,
          adherenceRating: legacyForm.adherenceRating ?? undefined,
          weekReview: legacyForm.weekReview || undefined,
          coachMessage: legacyForm.coachMessage || undefined,
          goalsNextWeek: legacyForm.goalsNextWeek || undefined,
        };
      }

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

  // ── Determine which system blocks the template positions ───────────────────
  const templateHasMetrics  = activeTemplate?.cards.some(c => c.kind === 'system' && c.systemType === 'metrics')  ?? false;
  const templateHasWorkouts = activeTemplate?.cards.some(c => c.kind === 'system' && c.systemType === 'workouts') ?? false;

  // In legacy mode, photos always appear above. In template mode, shown at card position.
  const showPhotosAbove = activeTemplate === null;

  // Clear responses for input fields hidden by conditions
  useEffect(() => {
    if (!activeTemplate) return;
    const allInputFields = getAllInputFields(activeTemplate);
    const hidden = allInputFields.filter(f => !isFieldVisible(f, customResponses));
    if (hidden.some(f => customResponses[f.id] !== undefined)) {
      setCustomResponses(prev => {
        const next = { ...prev };
        hidden.forEach(f => { delete next[f.id]; });
        return next;
      });
    }
  }, [activeTemplate, customResponses]);

  // ── Helper: render the workouts row ───────────────────────────────────────
  function WorkoutsRow() {
    return (
      <Box
        onClick={workoutClickable ? () => router.push(`/user/plan/${activePlanId}`) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Progress photos — in legacy mode only; template mode renders at card position */}
      {showPhotosAbove && (
        <>
          <ProgressPhotoSection
            currentPhotos={photoUrls}
            previousPhotos={previousPhotos}
            weekStart={new Date(checkIn.weekStartDate).toISOString()}
            onPhotoUploaded={(angle, url) => setPhotoUrls(p => ({ ...p, [angle]: url }))}
            onPhotoRemoved={(angle) => setPhotoUrls(p => ({ ...p, [angle]: null }))}
          />
          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Metrics summary — shown above only in legacy mode or when template doesn't include a metrics card */}
      {!templateHasMetrics && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Last 2 weeks of metrics</Typography>
          <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets} customMetricDefs={settings.customMetrics} />
        </>
      )}

      {/* Workout row — shown above only in legacy mode or when template doesn't include a workouts card */}
      {!templateHasWorkouts && (
        <Box sx={{ mt: templateHasMetrics ? 0 : 1.5 }}>
          <WorkoutsRow />
        </Box>
      )}

      {(!templateHasMetrics || !templateHasWorkouts) && <Divider sx={{ my: 3 }} />}

      {activeTemplate !== null ? (
        // ── Template mode: render cards in a 2-column responsive grid ─────────
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {activeTemplate.cards.map(card => {
            const gridColumn = { xs: '1 / -1', sm: `span ${card.columnSpan}` };

            if (card.kind === 'system') {
              return (
                <Paper key={card.id} variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
                  {card.systemType === 'photos' && (
                    <ProgressPhotoSection
                      currentPhotos={photoUrls}
                      previousPhotos={previousPhotos}
                      weekStart={new Date(checkIn.weekStartDate).toISOString()}
                      onPhotoUploaded={(angle, url) => setPhotoUrls(p => ({ ...p, [angle]: url }))}
                      onPhotoRemoved={(angle) => setPhotoUrls(p => ({ ...p, [angle]: null }))}
                    />
                  )}
                  {card.systemType === 'metrics' && (
                    <>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Last 2 weeks of metrics</Typography>
                      <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets} customMetricDefs={settings.customMetrics} />
                    </>
                  )}
                  {card.systemType === 'workouts' && <WorkoutsRow />}
                </Paper>
              );
            }

            // Custom card
            return (
              <CheckInCustomCard
                key={card.id}
                card={card}
                gridColumn={gridColumn}
                responses={customResponses}
                onChange={setCustomField}
              />
            );
          })}
        </Box>
      ) : (
        // ── Legacy mode: hardcoded ratings + text areas ────────────────────
        <>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>How was your week?</Typography>
          <RatingField label="Energy level" value={legacyForm.energyLevel} onChange={setLegacyRating('energyLevel')} />
          <RatingField label="Mood / Motivation" value={legacyForm.moodRating} onChange={setLegacyRating('moodRating')} />
          <RatingField label="Stress level" value={legacyForm.stressLevel} onChange={setLegacyRating('stressLevel')} />
          <RatingField label="Sleep quality (subjective)" value={legacyForm.sleepQuality} onChange={setLegacyRating('sleepQuality')} />
          <RatingField label="Recovery between sessions" value={legacyForm.recoveryRating} onChange={setLegacyRating('recoveryRating')} />
          <RatingField label="Adherence to plan" value={legacyForm.adherenceRating} onChange={setLegacyRating('adherenceRating')} />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 2 }}>Reflection</Typography>
          <TextField
            label="How did your week go overall?"
            multiline
            minRows={3}
            fullWidth
            value={legacyForm.weekReview}
            onChange={e => setLegacyForm(f => ({ ...f, weekReview: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Goals / focus for next week"
            multiline
            minRows={2}
            fullWidth
            value={legacyForm.goalsNextWeek}
            onChange={e => setLegacyForm(f => ({ ...f, goalsNextWeek: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Message to your coach (optional)"
            multiline
            minRows={2}
            fullWidth
            value={legacyForm.coachMessage}
            onChange={e => setLegacyForm(f => ({ ...f, coachMessage: e.target.value }))}
            sx={{ mb: 3 }}
          />
        </>
      )}

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
