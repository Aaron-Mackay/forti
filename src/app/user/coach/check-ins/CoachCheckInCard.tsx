'use client';

import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/PendingOutlined';
import type { CheckInWithUser } from '@/types/checkInTypes';

interface Props {
  checkIn: CheckInWithUser;
  onNotesUpdated: (id: number, notes: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High',
};

function RatingRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Chip label={`${value} — ${RATING_LABELS[value]}`} size="small" variant="outlined" />
    </Box>
  );
}

function NoteField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Box>
  );
}

export default function CoachCheckInCard({ checkIn, onNotesUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(checkIn.coachNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const isReviewed = !!checkIn.coachReviewedAt;

  async function handleSaveNotes() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/coach/check-ins/${checkIn.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachNotes: notes }),
      });
      if (!res.ok) throw new Error('Save failed');
      onNotesUpdated(checkIn.id, notes);
    } catch {
      setSaveError('Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(e => !e)}
      disableGutters
      sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
          {isReviewed
            ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', flexShrink: 0 }} />
            : <PendingIcon sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
          }
          <Box>
            <Typography variant="body2" fontWeight={600}>{checkIn.user.name}</Typography>
            <Typography variant="caption" color="text.secondary">Week of {weekLabel}</Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {/* Ratings */}
        <Typography variant="overline" color="text.secondary">Ratings</Typography>
        <RatingRow label="Energy" value={checkIn.energyLevel} />
        <RatingRow label="Mood" value={checkIn.moodRating} />
        <RatingRow label="Stress" value={checkIn.stressLevel} />
        <RatingRow label="Sleep quality" value={checkIn.sleepQuality} />
        <RatingRow label="Recovery" value={checkIn.recoveryRating} />
        <RatingRow label="Adherence" value={checkIn.adherenceRating} />

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

        {/* Text from client */}
        {(checkIn.weekReview || checkIn.coachMessage || checkIn.goalsNextWeek) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">From Client</Typography>
            <NoteField label="Week review" value={checkIn.weekReview} />
            <NoteField label="Message to coach" value={checkIn.coachMessage} />
            <NoteField label="Goals for next week" value={checkIn.goalsNextWeek} />
          </>
        )}

        {/* Progress photos */}
        {(checkIn.frontPhotoUrl || checkIn.backPhotoUrl || checkIn.sidePhotoUrl) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">Progress Photos</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {(['frontPhotoUrl', 'backPhotoUrl', 'sidePhotoUrl'] as const).map(field => {
                const url = checkIn[field];
                return url ? (
                  <Box
                    key={field}
                    component="img"
                    src={url}
                    alt={field.replace('PhotoUrl', '')}
                    sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                ) : (
                  <Box
                    key={field}
                    sx={{ width: 72, height: 72, borderRadius: 1, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}
                  />
                );
              })}
            </Box>
          </>
        )}

        {/* Coach notes */}
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="overline" color="text.secondary">Your Notes</Typography>
        <TextField
          multiline
          minRows={2}
          fullWidth
          size="small"
          placeholder="Leave feedback for your client…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          sx={{ mt: 1, mb: 1 }}
        />
        {saveError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{saveError}</Typography>
        )}
        <Button
          variant="contained"
          size="small"
          onClick={handleSaveNotes}
          disabled={saving || notes === (checkIn.coachNotes ?? '')}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          Save Notes
        </Button>
      </AccordionDetails>
    </Accordion>
  );
}
