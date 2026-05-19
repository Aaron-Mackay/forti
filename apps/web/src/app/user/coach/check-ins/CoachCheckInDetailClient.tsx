'use client';

import type {ReactNode} from 'react';
import {useMemo, useState} from 'react';
import type {TargetValues} from './CoachWeekTargetsCard';
import CoachWeekTargetsCard from './CoachWeekTargetsCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/PendingOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type {Metric} from '@/generated/prisma/browser';
import type {CheckInWithUser, WeekTargets} from '@/types/checkInTypes';
import {RATING_LABELS} from '@/types/checkInTypes';
import type {CustomMetricDef} from '@/types/settingsTypes';
import { parseDashboardSettings } from '@/types/settingsTypes';
import type {TargetTemplateWithDays} from '@lib/targetTemplates';
import {
  computeMacroGramsFromPercents,
  deriveMacroPercentsFromTargets,
  isMacroPercentSplitValid,
  sumMacroPercents,
} from '@lib/macroTargets';
import MetricsSystemCard from '@/components/checkin/MetricsSystemCard';
import WorkoutsSystemCard from '@/components/checkin/WorkoutsSystemCard';
import {checkInHasRatings, checkInHasReflection, checkInHasCustomResponses} from '@/lib/checkInUtils';
import {getAllTemplateCards, parseCheckInTemplate} from '@/types/checkInTemplateTypes';
import type {CheckInTemplate} from '@/types/checkInTemplateTypes';
import type {DataVizCard} from '@/types/datavizTypes';
import DataVizChartCard from '@/components/charts/DataVizChartCard';
import CheckInPhotoCompare from './_components/CheckInPhotoCompare';
import CustomCheckInResponseDisplay from '@/components/checkin/CustomCheckInResponseDisplay';
import SupplementsClient from '@/app/user/supplements/SupplementsClient';
import {getLoomEmbedUrl} from '@lib/loom';
import {saveCoachCheckInNotes, saveTargetTemplate} from '@lib/clientApi';
import { signalTokens } from '@lib/signal/tokens';
import { SignalSection as SignalSectionPrimitive } from '@/components/signal/SignalSection';
import { SignalButton } from '@/components/signal/SignalButton';

interface Props {
  checkIn: CheckInWithUser;
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  activeTemplate: TargetTemplateWithDays | null;
  customMetricDefs: CustomMetricDef[];
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
  coachTemplate: CheckInTemplate | null;
  signalEnabled?: boolean;
}

function Section({children, fillHeight = false}: { children: ReactNode; fillHeight?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: fillHeight ? '100%' : undefined,
        p: {xs: 2, sm: 2.5},
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      {children}
    </Paper>
  );
}

function RatingRow({label, value}: { label: string; value: number | null }) {
  if (value === null) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Chip label={`${value} · ${RATING_LABELS[value]}`} size="small" variant="outlined"/>
    </Box>
  );
}

function NoteBlock({label, value}: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{mt: 0.5, whiteSpace: 'pre-wrap'}}>
        {value}
      </Typography>
    </Box>
  );
}

function toIntOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function initTargetValues(tpl: TargetTemplateWithDays | null): TargetValues {
  const avgValue = (key: 'caloriesTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget') => {
    const values = tpl?.days
      .map(day => day[key])
      .filter((value): value is number => value != null) ?? [];
    if (values.length === 0) return '';
    return String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  };
  const caloriesTarget = avgValue('caloriesTarget');
  const caloriesNum = toIntOrNull(caloriesTarget);
  const percents = deriveMacroPercentsFromTargets(caloriesNum, {
    protein: toIntOrNull(avgValue('proteinTarget')) ?? 0,
    carbs: toIntOrNull(avgValue('carbsTarget')) ?? 0,
    fat: toIntOrNull(avgValue('fatTarget')) ?? 0,
  });

  return {
    steps: tpl?.stepsTarget != null ? String(tpl.stepsTarget) : '',
    sleep: tpl?.sleepMinsTarget != null ? String(tpl.sleepMinsTarget) : '',
    calories: caloriesTarget,
    proteinPct: String(percents.proteinPct),
    carbsPct: String(percents.carbsPct),
    fatPct: String(percents.fatPct),
  };
}

export default function CoachCheckInDetailClient({
                                                   checkIn,
                                                   currentWeek,
                                                 weekPrior,
                                                 weekTargets,
                                                 activeTemplate,
                                                 customMetricDefs,
                                                 workoutSummaries,
                                                 activePlanId,
                                                 coachTemplate,
                                                 signalEnabled = false,
                                                 }: Props) {
  const bodyweightUnit = parseDashboardSettings((checkIn.user as { settings?: unknown } | undefined)?.settings).bodyweightUnit;
  const [notes, setNotes] = useState(checkIn.coachNotes ?? '');
  const [coachResponseUrl, setCoachResponseUrl] = useState(checkIn.coachResponseUrl ?? '');
  const [targetValues, setTargetValues] = useState<TargetValues>(() => initTargetValues(activeTemplate));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState(checkIn.coachReviewedAt);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const baselineTargetValues = useMemo(() => initTargetValues(activeTemplate), [activeTemplate]);

  const caloriesTarget = toIntOrNull(targetValues.calories);
  const macroPercents = {
    proteinPct: toIntOrNull(targetValues.proteinPct) ?? 0,
    carbsPct: toIntOrNull(targetValues.carbsPct) ?? 0,
    fatPct: toIntOrNull(targetValues.fatPct) ?? 0,
  };
  const macroSplitValid = isMacroPercentSplitValid(caloriesTarget, macroPercents);
  const macroSplitError = macroSplitValid
    ? null
    : `Protein + Carbs + Fat must equal 100% (currently ${sumMacroPercents(macroPercents)}%).`;
  const targetsChanged = (
    targetValues.steps !== baselineTargetValues.steps ||
    targetValues.sleep !== baselineTargetValues.sleep ||
    targetValues.calories !== baselineTargetValues.calories ||
    targetValues.proteinPct !== baselineTargetValues.proteinPct ||
    targetValues.carbsPct !== baselineTargetValues.carbsPct ||
    targetValues.fatPct !== baselineTargetValues.fatPct
  );

  const activePlanHref = useMemo(() => {
    if (activePlanId === null) {
      return `/user/coach/clients/${checkIn.user.id}/plans`;
    }
    const params = new URLSearchParams({
      highlightCheckInWeekStart: new Date(checkIn.weekStartDate).toISOString().slice(0, 10),
    });
    return `/user/plan/${activePlanId}?${params.toString()}`;
  }, [activePlanId, checkIn.user.id, checkIn.weekStartDate]);

  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const submittedLabel = new Date(checkIn.completedAt ?? checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const isReviewed = Boolean(reviewedAt);
  const activeCoachResponseUrl = coachResponseUrl.trim() || checkIn.coachResponseUrl || null;
  const coachLoomEmbedUrl = getLoomEmbedUrl(activeCoachResponseUrl);

  async function handleSaveNotes() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);

    try {
      if (!macroSplitValid) {
        throw new Error(macroSplitError ?? 'Macro split must equal 100%.');
      }
      const grams = computeMacroGramsFromPercents(caloriesTarget, macroPercents);
      const macro = {
        caloriesTarget,
        proteinTarget: grams.protein,
        carbsTarget: grams.carbs,
        fatTarget: grams.fat,
      };
      const days: Record<number, typeof macro> = {};
      for (let dow = 1; dow <= 7; dow++) days[dow] = macro;

      const weekStartIso = new Date(checkIn.weekStartDate).toISOString().slice(0, 10);

      await Promise.all([
        saveCoachCheckInNotes(checkIn.id, {coachNotes: notes, coachResponseUrl}),
        saveTargetTemplate({
          effectiveFrom: weekStartIso,
          stepsTarget: toIntOrNull(targetValues.steps),
          sleepMinsTarget: toIntOrNull(targetValues.sleep),
          days,
          targetUserId: checkIn.user.id,
        }),
      ]);

      const savedAt = new Date();
      setReviewedAt(savedAt);
      setSaveSuccessMessage(`Review sent to ${checkIn.user.name} at ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isCustomMode = checkInHasCustomResponses(checkIn);
  const templateSnapshot = isCustomMode ? parseCheckInTemplate(checkIn.templateSnapshot) : null;
  const metricsCardConfig = templateSnapshot
    ? getAllTemplateCards(templateSnapshot).find(
    (card): card is Extract<ReturnType<typeof getAllTemplateCards>[number], { kind: 'system'; systemType: 'metrics' }> =>
      card.kind === 'system' && card.systemType === 'metrics',
  )?.metricConfig
    : undefined;
  const hasRatings = !isCustomMode && checkInHasRatings(checkIn);
  const hasReflection = !isCustomMode && checkInHasReflection(checkIn);
  const signalPalette = signalTokens.surface.planning;

  if (signalEnabled) {
    return (
      <Box sx={{ color: signalPalette.ink }}>
        <Box
          sx={{
            mb: 2,
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: `1px solid ${signalPalette.borderStrong}`,
            backgroundColor: signalPalette.surface,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Box>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 11,
                    color: signalPalette.inkLight,
                    mb: 0.75,
                  }}
                >
                  Client check-in
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: signalTokens.fontVar.cond,
                    fontSize: { xs: 30, md: 38 },
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    fontWeight: 700,
                    mb: 0.75,
                  }}
                >
                  {checkIn.user.name}
                </Typography>
                <Typography variant="body2" sx={{ color: signalPalette.inkMid }}>
                  Week of {weekLabel}
                </Typography>
              </Box>
              <Chip
                icon={isReviewed ? <CheckCircleIcon/> : <PendingIcon/>}
                label={isReviewed ? 'Reviewed' : 'Needs review'}
                sx={{
                  borderRadius: 999,
                  border: `1px solid ${isReviewed ? signalTokens.status.ok : signalTokens.signal.deep}`,
                  backgroundColor: isReviewed ? signalTokens.status.okDim : signalTokens.signal.dim,
                  color: signalPalette.ink,
                  '& .MuiChip-icon': {
                    color: isReviewed ? signalTokens.status.ok : signalTokens.signal.deep,
                  },
                }}
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              <SignalMetaTile label="Submitted" value={submittedLabel} />
              <SignalMetaTile
                label="Training"
                value={`${checkIn.completedWorkouts ?? '?'} / ${checkIn.plannedWorkouts ?? '?'} sessions`}
              />
              <SignalMetaTile
                label="Feedback"
                value={isReviewed && reviewedAt
                  ? `Sent ${reviewedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                  : 'Not sent yet'}
              />
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)' },
            alignItems: 'start',
          }}
        >
          <Stack spacing={2}>
            <SignalSection label="Photos">
              <CheckInPhotoCompare currentCheckIn={checkIn} signalEnabled />
            </SignalSection>

            {isCustomMode && templateSnapshot && (
              <SignalSection label="Custom responses">
                <CustomCheckInResponseDisplay
                  responses={checkIn.customResponses}
                  template={templateSnapshot}
                />
              </SignalSection>
            )}

            {coachTemplate && getAllTemplateCards(coachTemplate)
              .filter((c): c is DataVizCard => c.kind === 'dataviz')
              .map(card => (
                <DataVizChartCard
                  key={card.id}
                  card={card}
                  gridColumn={{ xs: '1 / -1', lg: `span ${card.columnSpan}` }}
                  clientId={checkIn.user.id}
                  mode="use"
                />
              ))}

            {hasRatings && (
              <SignalSection label="Subjective">
                <Box
                  sx={{
                    display: 'grid',
                    columnGap: 2,
                    rowGap: 0.5,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  }}
                >
                  <SignalRatingRow label="Energy" value={checkIn.energyLevel} />
                  <SignalRatingRow label="Mood" value={checkIn.moodRating} />
                  <SignalRatingRow label="Stress" value={checkIn.stressLevel} />
                  <SignalRatingRow label="Sleep quality" value={checkIn.sleepQuality} />
                  <SignalRatingRow label="Recovery" value={checkIn.recoveryRating} />
                  <SignalRatingRow label="Adherence" value={checkIn.adherenceRating} />
                </Box>
              </SignalSection>
            )}

            {hasReflection && (
              <SignalSection label="Client reflection">
                <Stack spacing={2}>
                  <SignalNoteBlock label="Week review" value={checkIn.weekReview} />
                  <SignalNoteBlock label="Goals for next week" value={checkIn.goalsNextWeek} />
                  <SignalNoteBlock label="Message to coach" value={checkIn.coachMessage} />
                </Stack>
              </SignalSection>
            )}

            {(currentWeek.length > 0 || weekPrior.length > 0) && (
              <SignalSection label="Metrics">
                <MetricsSystemCard
                  currentWeek={currentWeek}
                  weekPrior={weekPrior}
                  weekTargets={weekTargets}
                  customMetricDefs={customMetricDefs}
                  bodyweightUnit={bodyweightUnit}
                  weekStartDate={checkIn.weekStartDate}
                  expanded={metricsExpanded}
                  onExpandedChange={setMetricsExpanded}
                  interactive
                  metricConfig={metricsCardConfig}
                />
              </SignalSection>
            )}

            <SignalSection label="Training">
              <WorkoutsSystemCard
                workoutSummaries={workoutSummaries}
                onWorkoutsClick={() => {
                  window.open(activePlanHref, '_blank', 'noopener,noreferrer');
                }}
              />
            </SignalSection>
          </Stack>

          <Stack spacing={2}>
            <SignalSection label="Coach response" accent>
              <TextField
                multiline
                minRows={9}
                fullWidth
                placeholder="Leave feedback for your client…"
                value={notes}
                onChange={event => {
                  setNotes(event.target.value);
                  setSaveSuccessMessage(null);
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: signalPalette.surfaceAlt,
                  },
                }}
              />
              <TextField
                fullWidth
                label="Review link (optional)"
                placeholder="https://www.loom.com/share/..."
                value={coachResponseUrl}
                onChange={event => {
                  setCoachResponseUrl(event.target.value);
                  setSaveSuccessMessage(null);
                }}
                sx={{ mt: 2 }}
              />
              {coachLoomEmbedUrl ? (
                <Box
                  sx={{
                    mt: 1.5,
                    position: 'relative',
                    width: '100%',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'common.black',
                    '&::before': { content: '""', display: 'block', pt: '56.25%' },
                  }}
                >
                  <Box
                    component="iframe"
                    src={coachLoomEmbedUrl}
                    title="Coach Loom review"
                    allow="fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                </Box>
              ) : checkIn.coachResponseUrl && !coachResponseUrl ? (
                <Link
                  href={checkIn.coachResponseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ display: 'inline-block', mt: 1.5 }}
                >
                  Open current review link
                </Link>
              ) : null}

              {saveSuccessMessage && <Alert severity="success" sx={{ mt: 2 }}>{saveSuccessMessage}</Alert>}
              {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
              {!macroSplitValid && macroSplitError && <Alert severity="warning" sx={{ mt: 2 }}>{macroSplitError}</Alert>}

              <Box sx={{ mt: 2 }}>
                <SignalButton
                  intent="primary"
                  fullWidth
                  onClick={handleSaveNotes}
                  disabled={saving || !macroSplitValid || (!targetsChanged && notes === (checkIn.coachNotes ?? '') && coachResponseUrl === (checkIn.coachResponseUrl ?? ''))}
                  startIcon={saving ? <CircularProgress size={14} color="inherit"/> : undefined}
                >
                  Send review
                </SignalButton>
              </Box>
            </SignalSection>

            <SignalSection label="Week targets">
              <CoachWeekTargetsCard
                values={targetValues}
                onChange={setTargetValues}
                signalEnabled
              />
            </SignalSection>

            <SignalSection label="Support">
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  href={activePlanHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ justifyContent: 'space-between' }}
                >
                  Open current plan
                </Button>
                <Typography variant="body2" sx={{ color: signalPalette.inkMid }}>
                  Plan edits still open in the existing planning flow. Review stays here.
                </Typography>
              </Stack>
            </SignalSection>

            <SignalSection label="Supplements">
              <SupplementsClient
                embedded
                apiBase={`/api/coach/clients/${checkIn.user.id}/supplements`}
              />
            </SignalSection>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: {xs: 2, sm: 3},
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{xs: 'column', md: 'row'}}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{xs: 'flex-start', md: 'center'}}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Client Check-in
              </Typography>
              <Typography variant="h4" sx={{fontSize: {xs: '1.75rem', md: '2.2rem'}}}>
                {checkIn.user.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Week of {weekLabel}
              </Typography>
            </Box>
            <Chip
              icon={isReviewed ? <CheckCircleIcon/> : <PendingIcon/>}
              color={isReviewed ? 'success' : 'warning'}
              label={isReviewed ? 'Reviewed' : 'Needs review'}
            />
          </Stack>

          <Stack
            direction={{xs: 'column', sm: 'row'}}
            spacing={1}
            divider={<Divider flexItem orientation="vertical" sx={{display: {xs: 'none', sm: 'block'}}}/>}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Submitted
              </Typography>
              <Typography variant="body2">{submittedLabel}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Training
              </Typography>
              <Typography variant="body2">
                {checkIn.completedWorkouts ?? '?'} / {checkIn.plannedWorkouts ?? '?'} sessions completed
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))'},
            alignItems: {xs: 'start', lg: 'stretch'},
            height: {lg: '100%'},
            '& > :last-child:nth-child(2n+1)': {
              gridColumn: {xs: '1 / -1', sm: 'span 2'},
            },
          }}
        >
          <CheckInPhotoCompare currentCheckIn={checkIn} />

          {isCustomMode && templateSnapshot && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <CustomCheckInResponseDisplay
                responses={checkIn.customResponses}
                template={templateSnapshot}
              />
            </Box>
          )}

          {coachTemplate && getAllTemplateCards(coachTemplate)
            .filter((c): c is DataVizCard => c.kind === 'dataviz')
            .map(card => (
              <DataVizChartCard
                key={card.id}
                card={card}
                gridColumn={{ xs: '1 / -1', lg: `span ${card.columnSpan}` }}
                clientId={checkIn.user.id}
                mode="use"
              />
            ))
          }

          {hasRatings && (
            <Section>
              <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1}}>
                Subjective
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  columnGap: {md: 2},
                  gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'},
                }}
              >
                <RatingRow label="Energy" value={checkIn.energyLevel}/>
                <RatingRow label="Mood" value={checkIn.moodRating}/>
                <RatingRow label="Stress" value={checkIn.stressLevel}/>
                <RatingRow label="Sleep quality" value={checkIn.sleepQuality}/>
                <RatingRow label="Recovery" value={checkIn.recoveryRating}/>
                <RatingRow label="Adherence" value={checkIn.adherenceRating}/>
              </Box>
            </Section>)}

          {hasReflection && (
            <Section>
              <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1}}>
                Client Notes
              </Typography>
              <Stack spacing={2}>
                <NoteBlock label="Week review" value={checkIn.weekReview}/>
                <NoteBlock label="Goals for next week" value={checkIn.goalsNextWeek}/>
                <NoteBlock label="Message to coach" value={checkIn.coachMessage}/>
              </Stack>
            </Section>
          )}

          {(currentWeek.length > 0 || weekPrior.length > 0) && (
            <Box sx={{ gridColumn: {lg: metricsExpanded ? '1 / -1' : 'auto'} }}>
              <Section>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Metrics
                </Typography>
                <MetricsSystemCard
                  currentWeek={currentWeek}
                  weekPrior={weekPrior}
                  weekTargets={weekTargets}
                  customMetricDefs={customMetricDefs}
                  bodyweightUnit={bodyweightUnit}
                  weekStartDate={checkIn.weekStartDate}
                  expanded={metricsExpanded}
                  onExpandedChange={setMetricsExpanded}
                  interactive
                  metricConfig={metricsCardConfig}
                />
              </Section>
            </Box>
          )}


          <Section>
            <WorkoutsSystemCard
              workoutSummaries={workoutSummaries}
              onWorkoutsClick={() => {
                window.open(activePlanHref, '_blank', 'noopener,noreferrer');
              }}
            />
          </Section>
        </Box>

      </Box>
      <Stack spacing={2} sx={{mt: 2}}>
        <Section>
          <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
            Coach Comments
          </Typography>
          <TextField
            multiline
            minRows={8}
            fullWidth
            placeholder="Leave feedback for your client…"
            value={notes}
            onChange={event => {
              setNotes(event.target.value);
              setSaveSuccessMessage(null);
            }}
          />
          <TextField
            fullWidth
            label="Review link (optional)"
            placeholder="https://www.loom.com/share/..."
            value={coachResponseUrl}
            onChange={event => {
              setCoachResponseUrl(event.target.value);
              setSaveSuccessMessage(null);
            }}
            sx={{mt: 2}}
          />
          {coachLoomEmbedUrl ? (
            <Box
              sx={{
                mt: 1.5,
                position: 'relative',
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'common.black',
                '&::before': {content: '""', display: 'block', pt: '56.25%'},
              }}
            >
              <Box
                component="iframe"
                src={coachLoomEmbedUrl}
                title="Coach Loom review"
                allow="fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            </Box>
          ) : checkIn.coachResponseUrl && !coachResponseUrl ? (
            <Link
              href={checkIn.coachResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{display: 'inline-block', mt: 1.5}}
            >
              Open current review link
            </Link>
          ) : null}
        </Section>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))'},
            alignItems: {xs: 'start', lg: 'stretch'},
          }}
        >
          <CoachWeekTargetsCard
            values={targetValues}
            onChange={setTargetValues}
          />

          <Section>
            <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1}}>
              Supplements
            </Typography>
            <SupplementsClient
              embedded
              apiBase={`/api/coach/clients/${checkIn.user.id}/supplements`}
            />
          </Section>
        </Box>
      </Stack>

      {saveSuccessMessage && <Alert severity="success" sx={{mt: 2}}>{saveSuccessMessage}</Alert>}
      {saveError && <Alert severity="error" sx={{mt: 2}}>{saveError}</Alert>}
      <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} sx={{mt: 2, mb: 4}} alignItems={{sm: 'center'}}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSaveNotes}
          disabled={saving || !macroSplitValid || (!targetsChanged && notes === (checkIn.coachNotes ?? '') && coachResponseUrl === (checkIn.coachResponseUrl ?? ''))}
          startIcon={saving ? <CircularProgress size={16} color="inherit"/> : undefined}
        >
          Send Review
        </Button>
      </Stack>

    </Box>
  );
}

function SignalSection({
  label,
  children,
  accent = false,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <SignalSectionPrimitive label={label} accent={accent}>
      {children}
    </SignalSectionPrimitive>
  );
}

function SignalMetaTile({ label, value }: { label: string; value: string }) {
  const palette = signalTokens.surface.planning;
  return (
    <Box
      sx={{
        border: `1px solid ${palette.border}`,
        borderRadius: 2,
        backgroundColor: palette.surfaceAlt,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkLight,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: palette.ink }}>
        {value}
      </Typography>
    </Box>
  );
}

function SignalRatingRow({ label, value }: { label: string; value: number | null }) {
  const palette = signalTokens.surface.planning;
  if (value === null) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1,
        borderBottom: `1px solid ${palette.border}`,
        '&:last-of-type': {
          borderBottom: 'none',
        },
      }}
    >
      <Typography variant="body2" sx={{ color: palette.inkMid }}>
        {label}
      </Typography>
      <Chip
        label={`${value} · ${RATING_LABELS[value]}`}
        size="small"
        sx={{
          borderRadius: 999,
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
        }}
      />
    </Box>
  );
}

function SignalNoteBlock({ label, value }: { label: string; value: string | null }) {
  const palette = signalTokens.surface.planning;
  if (!value) return null;
  return (
    <Box>
      <Typography
        component="div"
        sx={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkLight,
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          color: palette.ink,
          fontFamily: signalTokens.font.serif,
          fontStyle: 'italic',
          lineHeight: 1.7,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
