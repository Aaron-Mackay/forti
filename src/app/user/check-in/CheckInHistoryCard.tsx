'use client';

import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { WeeklyCheckIn } from '@prisma/client';

interface Props {
  checkIn: WeeklyCheckIn;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High',
};

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

export default function CheckInHistoryCard({ checkIn }: Props) {
  const [expanded, setExpanded] = useState(false);

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
        {/* Ratings */}
        <Typography variant="overline" color="text.secondary">Ratings</Typography>
        <RatingChip label="Energy" value={checkIn.energyLevel} />
        <RatingChip label="Mood" value={checkIn.moodRating} />
        <RatingChip label="Stress" value={checkIn.stressLevel} />
        <RatingChip label="Sleep quality" value={checkIn.sleepQuality} />
        <RatingChip label="Recovery" value={checkIn.recoveryRating} />
        <RatingChip label="Adherence" value={checkIn.adherenceRating} />

        {/* Training */}
        {(checkIn.completedWorkouts !== null || checkIn.plannedWorkouts !== null) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">Training</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Workouts</Typography>
              <Typography variant="body2">
                {checkIn.completedWorkouts ?? '?'} / {checkIn.plannedWorkouts ?? '?'}
              </Typography>
            </Box>
          </>
        )}

        {/* Text fields */}
        {(checkIn.weekReview || checkIn.coachMessage || checkIn.goalsNextWeek) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">Reflection</Typography>
            <TextField label="Week review" value={checkIn.weekReview} />
            <TextField label="Message to coach" value={checkIn.coachMessage} />
            <TextField label="Goals for next week" value={checkIn.goalsNextWeek} />
          </>
        )}

        {/* Coach notes */}
        {checkIn.coachNotes && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">Coach Feedback</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{checkIn.coachNotes}</Typography>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
