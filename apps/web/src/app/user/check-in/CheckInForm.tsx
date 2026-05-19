'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import type { Metric, WeeklyCheckIn } from '@/generated/prisma/browser';
import { useSettings } from '@lib/providers/SettingsProvider';
import RatingField from './RatingField';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';
import TemplateCardRenderer from '@/components/checkin/TemplateCardRenderer';
import type { SystemCardData } from '@/components/checkin/TemplateCardRenderer';
import WorkoutsSystemCard from '@/components/checkin/WorkoutsSystemCard';
import MetricsSystemCard from '@/components/checkin/MetricsSystemCard';
import ProgressPhotoSection from './ProgressPhotoSection';
import { SignalSectionCard } from '@/components/signal/SignalSectionCard';
import type { PreviousPhotos, WeekTargets } from '@/types/checkInTypes';
import type { CheckInStep, CheckInTemplate, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import { parseCustomResponses, isFieldVisible, getAllInputFields, getAllTemplateCards } from '@/types/checkInTemplateTypes';
import type { SaveCheckInDraftRequest, SubmitCheckInRequest } from '@lib/contracts/checkIn';
import { useCheckInPayload } from './useCheckInPayload';
import { useCheckInPhotos } from './useCheckInPhotos';
import { useCheckInMetricsEditor } from './useCheckInMetricsEditor';
import { useCheckInAutosave } from './useCheckInAutosave';
import { saveCheckInDraft, submitCheckIn } from '@lib/clientApi';

interface Props {
  currentWeek: Metric[];
  weekPrior: Metric[];
  checkIn: WeeklyCheckIn;
  previousPhotos: PreviousPhotos | null;
  weekTargets: WeekTargets | null;
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  workoutSummaries: Array<{
    workoutId: number;
    workoutName: string;
    completedSets: number;
    plannedSets: number;
    muscleDoneSets: Array<{
      muscle: string;
      doneSets: number;
    }>;
  }>;
  activePlanId: number | null;
  template: CheckInTemplate | null;
  onSubmitted: () => void;
  signalEnabled?: boolean;
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
  return getAllTemplateCards(template).reduce<Record<string, boolean>>((acc, card) => {
    if (card.kind === 'system' && card.systemType === 'metrics') {
      acc[card.id] = card.columnSpan === 2;
    }
    return acc;
  }, {});
}

function isEmptyFieldValue(value: string | number | null | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function validateVisibleRequiredFieldsForStep(
  step: CheckInStep,
  responses: CustomCheckInResponses,
): string | null {
  for (const card of step.cards) {
    if (card.kind !== 'custom') continue;
    for (const field of card.fields) {
      if (!isFieldVisible(field, responses) || !field.required) continue;
      const value = responses[field.id];
      if (isEmptyFieldValue(value)) return `"${field.label}" is required`;
      if (field.type === 'rating' && typeof value !== 'number') return `"${field.label}" is required`;
      if (field.type === 'yesno' && value !== 'yes' && value !== 'no') return `"${field.label}" is required`;
    }
  }

  return null;
}

export default function CheckInForm({
  currentWeek, weekPrior, checkIn, previousPhotos, weekTargets,
  completedWorkoutsCount, plannedWorkoutsCount, workoutSummaries, activePlanId,
  template, onSubmitted, signalEnabled = false,
}: Props) {
  const router = useRouter();
  const { settings } = useSettings();
  const isEditing = Boolean(checkIn.completedAt);
  const activeTemplate = template ?? null;

  const { photoUrls, onPhotoUploaded, onPhotoRemoved } = useCheckInPhotos(checkIn);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // ── Template mode state ────────────────────────────────────────────────────
  const [customResponses, setCustomResponses] = useState<CustomCheckInResponses>(() =>
    parseCustomResponses(checkIn.customResponses)
  );
  const [metricsExpandedByCardId, setMetricsExpandedByCardId] = useState<Record<string, boolean>>(
    () => getInitialMetricsExpansion(activeTemplate)
  );
  const { currentWeekMetrics, handleMetricChange } = useCheckInMetricsEditor({
    checkIn,
    currentWeek,
    setError: (message) => setError(message),
  });

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

  const checkInPayload = useCheckInPayload({
    activeTemplate,
    customResponses,
    legacyForm,
    completedWorkoutsCount,
    plannedWorkoutsCount,
  });

  async function persistCheckIn(payload: SubmitCheckInRequest) {
    await submitCheckIn(payload);
  }

  async function persistDraft(payload: SaveCheckInDraftRequest | SubmitCheckInRequest) {
    await saveCheckInDraft(payload as SaveCheckInDraftRequest);
  }

  const templateDraftPayload = checkInPayload as SaveCheckInDraftRequest;
  const activeStep = activeTemplate?.steps[activeStepIndex] ?? null;
  const isLastStep = activeTemplate !== null && activeStepIndex === activeTemplate.steps.length - 1;

  async function handleSubmit() {
    if (activeTemplate) {
      for (const step of activeTemplate.steps) {
        const validationError = validateVisibleRequiredFieldsForStep(step, customResponses);
        if (validationError) {
          setError(validationError);
          const failingIndex = activeTemplate.steps.findIndex(candidate => candidate.id === step.id);
          if (failingIndex >= 0) setActiveStepIndex(failingIndex);
          return;
        }
      }
    }

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
  const trainingHref = activePlanId !== null
    ? `/user/plan/${activePlanId}?returnTo=${encodeURIComponent('/user/check-in')}`
    : null;

  // ── Determine which system blocks the template positions ───────────────────
  const templateCards = activeTemplate ? getAllTemplateCards(activeTemplate) : [];
  const templateHasMetrics  = templateCards.some(c => c.kind === 'system' && c.systemType === 'metrics');
  const templateHasWorkouts = templateCards.some(c => c.kind === 'system' && c.systemType === 'workouts');

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
    if (!activeTemplate) return;
    setActiveStepIndex(index => Math.min(index, activeTemplate.steps.length - 1));
  }, [activeTemplate]);

  useCheckInAutosave({
    enabled: isEditing,
    payload: checkInPayload,
    persist: persistCheckIn,
    setError: (message) => setError(message),
  });

  useCheckInAutosave({
    enabled: !isEditing && activeTemplate !== null,
    payload: templateDraftPayload,
    persist: persistDraft,
    setError: () => setError('Failed to auto-save check-in draft'),
    onSavingChange: setSavingDraft,
    onSaved: () => setLastDraftSavedAt(new Date()),
  });

  function handleNextStep() {
    if (!activeStep || !activeTemplate) return;
    const validationError = validateVisibleRequiredFieldsForStep(activeStep, customResponses);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setActiveStepIndex(index => Math.min(index + 1, activeTemplate.steps.length - 1));
  }

  function handlePreviousStep() {
    setError(null);
    setActiveStepIndex(index => Math.max(index - 1, 0));
  }

  const systemData: SystemCardData = {
    photoUrls,
    previousPhotos,
    weekStart: new Date(checkIn.weekStartDate).toISOString(),
    onPhotoUploaded,
    onPhotoRemoved,
    currentWeek: currentWeekMetrics,
    weekPrior,
    weekTargets,
    customMetricDefs: settings.customMetrics ?? [],
    bodyweightUnit: settings.bodyweightUnit,
    completedWorkoutsCount,
    plannedWorkoutsCount,
    workoutSummaries,
    onWorkoutsClick: workoutClickable && trainingHref ? () => router.push(trainingHref) : undefined,
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
            onPhotoUploaded={onPhotoUploaded}
            onPhotoRemoved={onPhotoRemoved}
          />
          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Metrics summary — shown above only in legacy mode or when template doesn't include a metrics card */}
      {!templateHasMetrics && (
        signalEnabled ? (
          <Box sx={{ mb: 2 }}>
            <SignalSectionCard eyebrow="Weekly metrics">
              <MetricsSystemCard
                currentWeek={currentWeekMetrics}
                weekPrior={weekPrior}
                weekTargets={weekTargets}
                customMetricDefs={settings.customMetrics ?? []}
                bodyweightUnit={settings.bodyweightUnit}
                weekStartDate={checkIn.weekStartDate}
                editableBreakdown
                onBreakdownMetricChange={handleMetricChange}
              />
            </SignalSectionCard>
          </Box>
        ) : (
          <MetricsSystemCard
            currentWeek={currentWeekMetrics}
            weekPrior={weekPrior}
            weekTargets={weekTargets}
            customMetricDefs={settings.customMetrics ?? []}
            bodyweightUnit={settings.bodyweightUnit}
            weekStartDate={checkIn.weekStartDate}
            editableBreakdown
            onBreakdownMetricChange={handleMetricChange}
          />
        )
      )}

      {/* Workout row — shown above only in legacy mode or when template doesn't include a workouts card */}
      {!templateHasWorkouts && (
        signalEnabled ? (
          <Box sx={{ mb: 2 }}>
            <SignalSectionCard eyebrow="Training">
              <WorkoutsSystemCard
                workoutSummaries={workoutSummaries}
                onWorkoutsClick={workoutClickable && trainingHref ? () => router.push(trainingHref) : undefined}
              />
            </SignalSectionCard>
          </Box>
        ) : (
          <Box sx={{ mt: templateHasMetrics ? 0 : 1.5 }}>
            <WorkoutsSystemCard
              workoutSummaries={workoutSummaries}
              onWorkoutsClick={workoutClickable && trainingHref ? () => router.push(trainingHref) : undefined}
            />
          </Box>
        )
      )}

      {(!templateHasMetrics || !templateHasWorkouts) && <Divider sx={{ my: 3 }} />}

      {activeTemplate !== null && activeStep !== null ? (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Step {activeStepIndex + 1} of {activeTemplate.steps.length}
              </Typography>
              <Typography variant="h6">{activeStep.title}</Typography>
              {activeStep.description && (
                <Typography variant="body2" color="text.secondary">
                  {activeStep.description}
                </Typography>
              )}
            </Box>
            {!isEditing && (
              <Typography variant="caption" color="text.secondary">
                {savingDraft ? 'Saving…' : lastDraftSavedAt ? `Saved ${lastDraftSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Draft not saved yet'}
              </Typography>
            )}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
          {activeStep.cards.map(card => {
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
                signalEnabled={signalEnabled}
              />
            );
          })}
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={handlePreviousStep} disabled={activeStepIndex === 0 || submitting}>
              Back
            </Button>
            {isEditing || isLastStep ? (
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
            ) : (
              <Button variant="contained" fullWidth onClick={handleNextStep}>
                Next
              </Button>
            )}
          </Stack>
        </>
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

      {!isEditing && activeTemplate === null && (
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
