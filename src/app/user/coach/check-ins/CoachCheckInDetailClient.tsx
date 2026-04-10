'use client';

import type {ReactNode} from 'react';
import {useState} from 'react';
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
import type {CheckInWithUser} from '@/types/checkInTypes';

interface Props {
  checkIn: CheckInWithUser;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
};

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

function PhotoTile({src, alt}: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <Box
        sx={{
          aspectRatio: '4 / 5',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: '100%',
        aspectRatio: '4 / 5',
        objectFit: 'cover',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}

export default function CoachCheckInDetailClient({checkIn}: Props) {
  const [notes, setNotes] = useState(checkIn.coachNotes ?? '');
  const [coachResponseUrl, setCoachResponseUrl] = useState(checkIn.coachResponseUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState(checkIn.coachReviewedAt);

  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
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
      const res = await fetch(`/api/coach/check-ins/${checkIn.id}/notes`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          coachNotes: notes,
          coachResponseUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'Save failed');
      }

      setReviewedAt(new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save review. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{maxWidth: 1180, mx: 'auto', pb: {xs: 5, md: 7}}}>
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
            pb: 2
          }}
        >
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
          </Section>

          {(checkIn.weekReview || checkIn.coachMessage || checkIn.goalsNextWeek) && (
            <Box sx={{height: {lg: '100%'}}}>
              <Section >
                <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1}}>
                  Client Notes
                </Typography>
                <Stack spacing={2}>
                  <NoteBlock label="Week review" value={checkIn.weekReview}/>
                  <NoteBlock label="Goals for next week" value={checkIn.goalsNextWeek}/>
                  <NoteBlock label="Message to coach" value={checkIn.coachMessage}/>
                </Stack>
              </Section>
            </Box>
          )}

          {(checkIn.frontPhotoUrl || checkIn.backPhotoUrl || checkIn.sidePhotoUrl) && (
            <Box sx={{height: {lg: '100%'}}}>
              <Section fillHeight>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
                  Progress photos
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: {
                      xs: 'repeat(2, minmax(0, 1fr))',
                      sm: 'repeat(3, minmax(0, 1fr))',
                    },
                  }}
                >
                  <PhotoTile src={checkIn.frontPhotoUrl} alt="Front progress photo"/>
                  <PhotoTile src={checkIn.sidePhotoUrl} alt="Side progress photo"/>
                  <PhotoTile src={checkIn.backPhotoUrl} alt="Back progress photo"/>
                </Box>
              </Section>
            </Box>
          )}
        </Box>

      </Box>
      <Section>
        <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
          Coach Review
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
        {saveError && <Alert severity="error" sx={{mt: 2}}>{saveError}</Alert>}
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} sx={{mt: 2}} alignItems={{sm: 'center'}}>
          <Button
            variant="contained"
            onClick={handleSaveNotes}
            disabled={saving || (notes === (checkIn.coachNotes ?? '') && coachResponseUrl === (checkIn.coachResponseUrl ?? ''))}
            startIcon={saving ? <CircularProgress size={16} color="inherit"/> : undefined}
          >
            Send Review
          </Button>
        </Stack>
      </Section>
    </Box>
  );
}
