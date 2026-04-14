'use client';

import type {ReactNode} from 'react';
import {useState} from 'react';
import type {TargetValues} from './CoachWeekTargetsCard';
import CoachWeekTargetsCard from './CoachWeekTargetsCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PendingIcon from '@mui/icons-material/PendingOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import type {Metric} from '@/generated/prisma/browser';
import type {CheckInWithUser, WeekTargets} from '@/types/checkInTypes';
import {RATING_LABELS} from '@/types/checkInTypes';
import type {CustomMetricDef} from '@/types/settingsTypes';
import type {TargetTemplateWithDays} from '@lib/targetTemplates';
import MetricsSummaryTable from '@/components/MetricsSummaryTable';
import {checkInHasPhotos, checkInHasRatings, checkInHasReflection} from '@/lib/checkInUtils';
import CheckInPhotoTile from '@/components/CheckInPhotoTile';
import PhotoViewerDialog from '@/components/PhotoViewerDialog';
import SupplementsClient from '@/app/user/supplements/SupplementsClient';
import MetricsDailyBreakdown from '@/components/MetricsDailyBreakdown';

interface WeekWorkout {
  id: number;
  name: string;
  dateCompleted: string;
  week: { planId: number };
}

interface Props {
  checkIn: CheckInWithUser;
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  activeTemplate: TargetTemplateWithDays | null;
  customMetricDefs: CustomMetricDef[];
  weekWorkouts: WeekWorkout[];
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
  const firstNonNull = (key: 'caloriesTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget') => {
    const day = tpl?.days.find(d => d[key] != null);
    return day?.[key] != null ? String(day[key]) : '';
  };
  return {
    steps: tpl?.stepsTarget != null ? String(tpl.stepsTarget) : '',
    sleep: tpl?.sleepMinsTarget != null ? String(tpl.sleepMinsTarget) : '',
    calories: firstNonNull('caloriesTarget'),
    protein: firstNonNull('proteinTarget'),
    carbs: firstNonNull('carbsTarget'),
    fat: firstNonNull('fatTarget'),
  };
}

export default function CoachCheckInDetailClient({
                                                   checkIn,
                                                   currentWeek,
                                                   weekPrior,
                                                   weekTargets,
                                                   activeTemplate,
                                                   customMetricDefs,
                                                   weekWorkouts
                                                 }: Props) {
  const [notes, setNotes] = useState(checkIn.coachNotes ?? '');
  const [coachResponseUrl, setCoachResponseUrl] = useState(checkIn.coachResponseUrl ?? '');
  const [targetValues, setTargetValues] = useState<TargetValues>(() => initTargetValues(activeTemplate));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState(checkIn.coachReviewedAt);
  const [activePhoto, setActivePhoto] = useState<{ src: string; alt: string } | null>(null);
  const [metricsExpanded, setMetricsExpanded] = useState(false);

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

  async function handleSaveNotes() {
    setSaving(true);
    setSaveError(null);

    try {
      const macro = {
        caloriesTarget: toIntOrNull(targetValues.calories),
        proteinTarget: toIntOrNull(targetValues.protein),
        carbsTarget: toIntOrNull(targetValues.carbs),
        fatTarget: toIntOrNull(targetValues.fat),
      };
      const days: Record<number, typeof macro> = {};
      for (let dow = 1; dow <= 7; dow++) days[dow] = macro;

      const weekStartIso = new Date(checkIn.weekStartDate).toISOString().slice(0, 10);

      await Promise.all([
        fetch(`/api/coach/check-ins/${checkIn.id}/notes`, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({coachNotes: notes, coachResponseUrl}),
        }).then(async res => {
          if (!res.ok) {
            const data = await res.json().catch(() => null) as { error?: string } | null;
            throw new Error(data?.error ?? 'Failed to save review');
          }
        }),
        fetch('/api/target-templates', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            effectiveFrom: weekStartIso,
            stepsTarget: toIntOrNull(targetValues.steps),
            sleepMinsTarget: toIntOrNull(targetValues.sleep),
            days,
            targetUserId: checkIn.user.id,
          }),
        }).then(res => {
          if (!res.ok) throw new Error('Failed to save targets');
        }),
      ]);

      setReviewedAt(new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const hasRatings = checkInHasRatings(checkIn);
  const hasReflection = checkInHasReflection(checkIn);
  const hasPhotos = checkInHasPhotos(checkIn);

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
                {checkIn.completedWorkouts ?? '?'} / {checkIn.plannedWorkouts ?? '?'} workouts completed
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
          {hasPhotos && (
            <Section>
              <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
                Progress photos
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
                }}
              >
                <CheckInPhotoTile
                  src={checkIn.frontPhotoUrl}
                  alt="Front progress photo"
                  onClick={(src, alt) => setActivePhoto({src, alt})}
                />
                <CheckInPhotoTile
                  src={checkIn.sidePhotoUrl}
                  alt="Side progress photo"
                  onClick={(src, alt) => setActivePhoto({src, alt})}
                />
                <CheckInPhotoTile
                  src={checkIn.backPhotoUrl}
                  alt="Back progress photo"
                  onClick={(src, alt) => setActivePhoto({src, alt})}
                />
              </Box>
            </Section>
          )}

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
            <Box sx={{
              gridColumn: {lg: metricsExpanded ? '1 / -1' : 'auto'},
              width: {
                xs: 'calc(100dvw - 32px)',
                lg: 'auto'
              }
            }}>
              <Section>
                {/* Header with expand toggle */}
                <Box sx={{display: 'flex', alignItems: 'center', mb: 1.5}}>
                  <Typography variant="overline" color="text.secondary" sx={{flexGrow: 1}}>
                    Metrics
                  </Typography>
                  <IconButton size="small" onClick={() => setMetricsExpanded(e => !e)}
                              aria-label="Toggle daily breakdown">
                    {/* Mobile: vertical unfold */}
                    <Box sx={{display: {xs: 'flex', lg: 'none'}}}>
                      {metricsExpanded ? <UnfoldLessIcon/> : <UnfoldMoreIcon/>}
                    </Box>
                    {/* Desktop: horizontal unfold (rotated 90°) */}
                    <Box sx={{display: {xs: 'none', lg: 'flex'}}}>
                      {metricsExpanded
                        ? <UnfoldLessIcon sx={{transform: 'rotate(90deg)'}}/>
                        : <UnfoldMoreIcon sx={{transform: 'rotate(90deg)'}}/>}
                    </Box>
                  </IconButton>
                </Box>

                {/* Desktop: CSS transition on the right half */}
                <Box sx={{display: {xs: 'none', lg: 'flex'}, alignItems: 'flex-start', gap: 2}}>
                  <Box sx={{flex: '1 1 0', minWidth: 0}}>
                    <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets}
                                         customMetricDefs={customMetricDefs}/>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    flex: metricsExpanded ? '1 1 0' : '0 0 0',
                    minWidth: 0,
                    gap: 2,
                    maxWidth: metricsExpanded ? '100dvw' : 0,
                    height: metricsExpanded ? 'auto' : 0,
                    opacity: metricsExpanded ? 1 : 0,
                    transition: 'max-width 300ms ease, opacity 200ms ease',
                    alignItems: 'flex-start',
                  }}>
                    <Divider orientation="vertical" flexItem/>
                    <Box sx={{flex: 1, minWidth: 0}}>
                      <MetricsDailyBreakdown metrics={currentWeek} weekStartDate={checkIn.weekStartDate}
                                             customMetricDefs={customMetricDefs} showMetricColumn={false}/>
                    </Box>
                  </Box>
                </Box>

                {/* Mobile: vertical collapse */}
                <Box sx={{display: {xs: 'block', lg: 'none'}}}>
                  <MetricsSummaryTable currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets}
                                       customMetricDefs={customMetricDefs}/>
                  <Collapse in={metricsExpanded} unmountOnExit>
                    <Divider sx={{py: 1}}/>
                    <Box sx={{overflowX: 'scroll',}}>
                      <MetricsDailyBreakdown metrics={currentWeek} weekStartDate={checkIn.weekStartDate}
                                             customMetricDefs={customMetricDefs}/>
                    </Box>
                  </Collapse>
                </Box>
              </Section>
            </Box>
          )}


          <Card variant="outlined" sx={{height: '100%', borderRadius: 3}}>
            <CardActionArea
              component="a"
              href={weekWorkouts.length > 0
                ? `/user/plan/${weekWorkouts[weekWorkouts.length - 1].week.planId}`
                : `/user/coach/clients/${checkIn.user.id}/plans`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{height: '100%'}}
            >
              <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%', p: {xs: 2, sm: 2.5}}}>
                <Box sx={{display: 'flex', alignItems: 'center', mb: 1.5}}>
                  <Typography variant="overline" color="text.secondary" sx={{flexGrow: 1}}>
                    Training
                  </Typography>
                  <ChevronRightIcon fontSize="small" color="action"/>
                </Box>
                {weekWorkouts.length > 0 ? (
                  <Stack spacing={0.5}>
                    {weekWorkouts.map(w => (
                      <Box key={w.id} sx={{display: 'flex', gap: 1.5, alignItems: 'baseline'}}>
                        <Typography variant="caption" color="text.secondary" sx={{minWidth: 28}}>
                          {new Date(w.dateCompleted).toLocaleDateString('en-GB', {weekday: 'short'})}
                        </Typography>
                        <Typography variant="body2">{w.name}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">No workouts logged in the last 7 days.</Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
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
            onChange={event => setNotes(event.target.value)}
          />
          <TextField
            fullWidth
            label="Review link (optional)"
            placeholder="https://www.loom.com/share/..."
            value={coachResponseUrl}
            onChange={event => setCoachResponseUrl(event.target.value)}
            sx={{mt: 2}}
          />
          {checkIn.coachResponseUrl && !coachResponseUrl && (
            <Link
              href={checkIn.coachResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{display: 'inline-block', mt: 1.5}}
            >
              Open current review link
            </Link>
          )}
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

      {saveError && <Alert severity="error" sx={{mt: 2}}>{saveError}</Alert>}
      <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} sx={{mt: 2, mb: 4}} alignItems={{sm: 'center'}}>
        <Button
          variant="contained"
          onClick={handleSaveNotes}
          disabled={saving || (notes === (checkIn.coachNotes ?? '') && coachResponseUrl === (checkIn.coachResponseUrl ?? ''))}
          startIcon={saving ? <CircularProgress size={16} color="inherit"/> : undefined}
        >
          Send Review
        </Button>
      </Stack>

      <PhotoViewerDialog photo={activePhoto} onClose={() => setActivePhoto(null)}/>
    </Box>
  );
}
