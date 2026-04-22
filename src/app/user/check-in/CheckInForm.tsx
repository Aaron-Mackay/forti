'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSettings } from '@lib/providers/SettingsProvider';
import RatingField from './RatingField';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';
import { updateMetricClient } from '@lib/metrics';
import TemplateCardRenderer from '@/components/TemplateCardRenderer';
import type { SystemCardData } from '@/components/TemplateCardRenderer';
import type { MetricBreakdownKey } from '@/components/MetricsDailyBreakdown';
import MetricsSystemCard from '@/components/MetricsSystemCard';
import ProgressPhotoSection from './ProgressPhotoSection';
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

function getInitialMetricsExpansion(template: CheckInTemplate | null): Record<string, boolean> {
  if (!template) return {};
  return template.cards.reduce<Record<string, boolean>>((acc, card) => {
    if (card.kind === 'system' && card.systemType === 'metrics') {
      acc[card.id] = card.columnSpan === 2;
    }
    return acc;
  }, {});
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
  const [metricsExpandedByCardId, setMetricsExpandedByCardId] = useState<Record<string, boolean>>(
    () => getInitialMetricsExpansion(activeTemplate)
  );
  const [currentWeekMetrics, setCurrentWeekMetrics] = useState<Metric[]>(currentWeek);
  const metricSaveTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const checkInSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialAutoSaveRunRef = useRef(false);

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

  const checkInPayload = useMemo(() => {
    if (activeTemplate !== null) {
      return {
        customResponses,
        completedWorkouts: completedWorkoutsCount,
        plannedWorkouts: plannedWorkoutsCount,
      } as Record<string, unknown>;
    }

    return {
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
    } as Record<string, unknown>;
  }, [activeTemplate, customResponses, completedWorkoutsCount, plannedWorkoutsCount, legacyForm]);

  async function persistCheckIn(payload: Record<string, unknown>) {
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? 'Submission failed');
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await persistCheckIn(checkInPayload);
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

  useEffect(() => {
    setMetricsExpandedByCardId(getInitialMetricsExpansion(activeTemplate));
  }, [activeTemplate]);
  useEffect(() => {
    setCurrentWeekMetrics(currentWeek);
  }, [currentWeek]);

  useEffect(() => {
    return () => {
      metricSaveTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      metricSaveTimeoutsRef.current.clear();
      if (checkInSaveTimeoutRef.current) {
        clearTimeout(checkInSaveTimeoutRef.current);
        checkInSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    if (!hasInitialAutoSaveRunRef.current) {
      hasInitialAutoSaveRunRef.current = true;
      return;
    }

    if (checkInSaveTimeoutRef.current) clearTimeout(checkInSaveTimeoutRef.current);
    checkInSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await persistCheckIn(checkInPayload);
      } catch {
        setError('Failed to auto-save check-in');
      } finally {
        checkInSaveTimeoutRef.current = null;
      }
    }, 500);
  }, [isEditing, checkInPayload]);

  const handleMetricChange = useCallback((dayOffset: number, key: MetricBreakdownKey, value: number | null) => {
    const d = new Date(checkIn.weekStartDate);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    const dateIso = d.toISOString().slice(0, 10);

    let nextMetric: Metric | null = null;
    setCurrentWeekMetrics(prev => {
      const idx = prev.findIndex(m => new Date(m.date).toISOString().slice(0, 10) === dateIso);
      const existing = idx >= 0 ? prev[idx] : undefined;
      const baseMetric: Metric = existing ?? {
        id: 0,
        userId: checkIn.userId,
        date: new Date(dateIso),
        weight: null,
        steps: null,
        sleepMins: null,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        customMetrics: null,
      };
      nextMetric = key.startsWith('custom:')
        ? {
          ...baseMetric,
          customMetrics: {
            ...((baseMetric.customMetrics as Record<string, { value: number | null; target: number | null }> | null) ?? {}),
            [key.replace('custom:', '')]: { value, target: null },
          },
        }
        : { ...baseMetric, [key]: value } as Metric;

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nextMetric;
        return next;
      }
      return [...prev, nextMetric];
    });

    if (!nextMetric) return;

    const saveKey = `${dateIso}:${key}`;
    const existingTimeout = metricSaveTimeoutsRef.current.get(saveKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(async () => {
      try {
        await updateMetricClient(nextMetric as Metric);
      } catch {
        setError('Failed to update metric');
      } finally {
        metricSaveTimeoutsRef.current.delete(saveKey);
      }
    }, 400);
    metricSaveTimeoutsRef.current.set(saveKey, timeoutId);
  }, [checkIn.userId, checkIn.weekStartDate]);

  const systemData: SystemCardData = {
    photoUrls,
    previousPhotos,
    weekStart: new Date(checkIn.weekStartDate).toISOString(),
    onPhotoUploaded: (angle, url) => setPhotoUrls(p => ({ ...p, [angle]: url })),
    onPhotoRemoved: (angle) => setPhotoUrls(p => ({ ...p, [angle]: null })),
    currentWeek: currentWeekMetrics,
    weekPrior,
    weekTargets,
    customMetricDefs: settings.customMetrics ?? [],
    completedWorkoutsCount,
    plannedWorkoutsCount,
    onWorkoutsClick: workoutClickable ? () => router.push(`/user/plan/${activePlanId}`) : undefined,
    canEditMetrics: true,
    onMetricChange: handleMetricChange,
  };

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
          <MetricsSystemCard
            currentWeek={currentWeekMetrics}
            weekPrior={weekPrior}
            weekTargets={weekTargets}
            customMetricDefs={settings.customMetrics ?? []}
            weekStartDate={checkIn.weekStartDate}
            editableBreakdown
            onBreakdownMetricChange={handleMetricChange}
          />
        </>
      )}

      {/* Workout row — shown above only in legacy mode or when template doesn't include a workouts card */}
      {!templateHasWorkouts && (
        <Box
          onClick={workoutClickable ? () => router.push(`/user/plan/${activePlanId}`) : undefined}
          sx={{
            mt: templateHasMetrics ? 0 : 1.5,
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
          <Typography variant="body2" color="text.secondary">Training</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {completedWorkoutsCount}/{plannedWorkoutsCount}
            </Typography>
            {workoutClickable && <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
          </Box>
        </Box>
      )}

      {(!templateHasMetrics || !templateHasWorkouts) && <Divider sx={{ my: 3 }} />}

      {activeTemplate !== null ? (
        // ── Template mode: render cards in a 2-column responsive grid ─────────
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
          {activeTemplate.cards.map(card => {
            const metricsExpanded = card.kind === 'system' && card.systemType === 'metrics'
              ? (metricsExpandedByCardId[card.id] ?? card.columnSpan === 2)
              : undefined;
            const smSpan = card.kind === 'system' && card.systemType === 'metrics'
              ? (metricsExpanded ? 2 : 1)
              : card.columnSpan;

            return (
              <TemplateCardRenderer
                key={card.id}
                card={card}
                gridColumn={{ xs: '1 / -1', sm: `span ${smSpan}` }}
                systemData={systemData}
                responses={customResponses}
                onResponseChange={setCustomField}
                metricsExpanded={metricsExpanded}
                onMetricsExpandedChange={next =>
                  setMetricsExpandedByCardId(prev => ({ ...prev, [card.id]: next }))
                }
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

      {!isEditing && (
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          size="large"
          sx={{ mt: 2 }}
        >
          Submit Check-in
        </Button>
      )}
    </Box>
  );
}
