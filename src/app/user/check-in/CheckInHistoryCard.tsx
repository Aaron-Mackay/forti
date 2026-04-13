'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Link,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { WeeklyCheckIn } from '@/generated/prisma/browser';
import { RATING_LABELS } from '@/types/checkInTypes';
import { checkInHasRatings, checkInHasReflection, checkInHasPhotos } from '@/lib/checkInUtils';
import CheckInPhotoTile from '@/components/CheckInPhotoTile';
import PhotoViewerDialog from '@/components/PhotoViewerDialog';

interface Props {
  checkIn: WeeklyCheckIn;
  defaultExpanded?: boolean;
}

function RatingChip({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Chip label={`${value} — ${RATING_LABELS[value]}`} size="small" variant="outlined" />
    </Box>
  );
}

function TextField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Box>
  );
}

export function CheckInDetails({
  checkIn,
  onPhotoOpen,
}: {
  checkIn: WeeklyCheckIn;
  onPhotoOpen?: (src: string, alt: string) => void;
}) {
  const hasRatings = checkInHasRatings(checkIn);
  const hasTraining = checkIn.completedWorkouts !== null || checkIn.plannedWorkouts !== null;
  const hasReflection = checkInHasReflection(checkIn);
  const hasPhotos = checkInHasPhotos(checkIn);

  return (
    <>
      {hasRatings && (
        <>
          <Typography variant="overline" color="text.secondary">Ratings</Typography>
          <RatingChip label="Energy" value={checkIn.energyLevel} />
          <RatingChip label="Mood" value={checkIn.moodRating} />
          <RatingChip label="Stress" value={checkIn.stressLevel} />
          <RatingChip label="Sleep quality" value={checkIn.sleepQuality} />
          <RatingChip label="Recovery" value={checkIn.recoveryRating} />
          <RatingChip label="Adherence" value={checkIn.adherenceRating} />
        </>
      )}

      {hasTraining && (
        <>
          {hasRatings && <Divider sx={{ my: 1.5 }} />}
          <Typography variant="overline" color="text.secondary">Training</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Workouts</Typography>
            <Typography variant="body2">
              {checkIn.completedWorkouts ?? '?'} / {checkIn.plannedWorkouts ?? '?'}
            </Typography>
          </Box>
        </>
      )}

      {hasReflection && (
        <>
          {(hasRatings || hasTraining) && <Divider sx={{ my: 1.5 }} />}
          <Typography variant="overline" color="text.secondary">Reflection</Typography>
          <TextField label="Week review" value={checkIn.weekReview} />
          <TextField label="Goals for next week" value={checkIn.goalsNextWeek} />
          <TextField label="Message to coach" value={checkIn.coachMessage} />
        </>
      )}

      {hasPhotos && (
        <>
          {(hasRatings || hasTraining || hasReflection) && <Divider sx={{ my: 1.5 }} />}
          <Typography variant="overline" color="text.secondary">Progress Photos</Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              mt: 0.5,
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            }}
          >
            <CheckInPhotoTile
              src={checkIn.frontPhotoUrl}
              alt="Front progress photo"
              onClick={onPhotoOpen}
            />
            <CheckInPhotoTile
              src={checkIn.sidePhotoUrl}
              alt="Side progress photo"
              onClick={onPhotoOpen}
            />
            <CheckInPhotoTile
              src={checkIn.backPhotoUrl}
              alt="Back progress photo"
              onClick={onPhotoOpen}
            />
          </Box>
        </>
      )}

      {checkIn.coachNotes && (
        <>
          {(hasRatings || hasTraining || hasReflection || hasPhotos) && <Divider sx={{ my: 1.5 }} />}
          <Typography variant="overline" color="text.secondary">Coach Feedback</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{checkIn.coachNotes}</Typography>
          {checkIn.coachResponseUrl && (
            <Link
              href={checkIn.coachResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: 'inline-block', mt: 1 }}
            >
              Open coach response
            </Link>
          )}
        </>
      )}
    </>
  );
}

export default function CheckInHistoryCard({ checkIn, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activePhoto, setActivePhoto] = useState<{ src: string; alt: string } | null>(null);

  const weekStart = new Date(checkIn.weekStartDate);
  const weekLabel = weekStart.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const completedLabel = checkIn.completedAt
    ? new Date(checkIn.completedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(e => !e)}
      disableGutters
      sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
          {checkIn.completedAt && (
            <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', flexShrink: 0 }} />
          )}
          <Box>
            <Typography variant="body2" fontWeight={600}>Week of {weekLabel}</Typography>
            {completedLabel && (
              <Typography variant="caption" color="text.secondary">Submitted {completedLabel}</Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <CheckInDetails
          checkIn={checkIn}
          onPhotoOpen={(src, alt) => setActivePhoto({ src, alt })}
        />
      </AccordionDetails>

      <PhotoViewerDialog photo={activePhoto} onClose={() => setActivePhoto(null)} />
    </Accordion>
  );
}
