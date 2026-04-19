'use client';

import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {
  Box,
  Button,
  Chip,
  Skeleton,
  SwipeableDrawer,
  TextField,
  Typography,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import LinkIcon from '@mui/icons-material/Link';
import {Exercise} from '@/generated/prisma/browser';
import {format} from 'date-fns';
import MuscleHighlight from '@/components/MuscleHighlight';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';
import {PRIMARY_COLOUR} from '@lib/theme';
import type {ExerciseCoachNote} from './types';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({default: () => null})),
  {ssr: false, loading: () => <Skeleton variant="rounded" height={180}/>},
);

function toTitleCase(str: string) {
  return str.split(/[-\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function E1rmChart({exercise}: {exercise: Exercise}) {
  const [history, setHistory] = useState<E1rmHistoryPoint[] | null>(null);

  useEffect(() => {
    fetch(`/api/exercises/${exercise.id}/e1rm-history`)
      .then(r => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [exercise.id]);

  if (history === null) return <Skeleton variant="rounded" height={180}/>;

  if (history.length === 0) {
    return (
      <Box
        sx={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No workout history yet.
        </Typography>
      </Box>
    );
  }

  const series = [{name: 'Best e1RM', data: history.map(p => parseFloat(p.bestE1rm.toFixed(1)))}];
  const categories = history.map(p => format(new Date(p.date), 'dd MMM yy'));

  return (
    <Chart
      type="line"
      height={180}
      series={series}
      options={{
        chart: {
          id: `e1rm-chart-${exercise.id}`,
          toolbar: {show: false},
          animations: {enabled: false},
        },
        stroke: {curve: 'smooth', width: 2},
        markers: {size: 4},
        xaxis: {
          categories,
          labels: {rotate: -30, style: {fontSize: '11px'}},
          tickAmount: Math.min(history.length, 6),
        },
        colors: [PRIMARY_COLOUR],
      }}
    />
  );
}

export default function ExerciseDetailDrawer({
  exercise,
  onClose,
  coachNote,
  userExerciseNote,
  isCoachPortal,
  onCoachNoteSave,
  onUserExerciseNoteSave,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  coachNote?: ExerciseCoachNote;
  userExerciseNote: string;
  isCoachPortal: boolean;
  onCoachNoteSave: (exerciseId: number, note: ExerciseCoachNote | null) => void;
  onUserExerciseNoteSave: (exerciseId: number, note: string) => void;
}) {
  const [coachDraft, setCoachDraft] = useState('');
  const [coachUrlDraft, setCoachUrlDraft] = useState('');
  const [userNoteDraft, setUserNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);

  // Sync draft when the selected exercise or its coach note changes
  useEffect(() => {
    setCoachDraft(coachNote?.note ?? '');
    setCoachUrlDraft(coachNote?.url ?? '');
  }, [exercise?.id, coachNote]);

  useEffect(() => {
    setUserNoteDraft(userExerciseNote);
  }, [exercise?.id, userExerciseNote]);

  const handleSave = async () => {
    if (!exercise) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/coach/exercise-description/${exercise.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({note: coachDraft, url: coachUrlDraft}),
      });
      if (res.ok) {
        onCoachNoteSave(exercise.id, {
          note: coachDraft.trim(),
          url: coachUrlDraft.trim() || null,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!exercise) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/coach/exercise-description/${exercise.id}`, {method: 'DELETE'});
      if (res.ok) {
        setCoachDraft('');
        setCoachUrlDraft('');
        onCoachNoteSave(exercise.id, null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUserNoteBlur = async () => {
    if (!exercise) return;
    setUserSaving(true);
    try {
      const res = await fetch(`/api/exerciseNote/${exercise.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({note: userNoteDraft}),
      });
      if (res.ok) {
        onUserExerciseNoteSave(exercise.id, userNoteDraft);
      }
    } finally {
      setUserSaving(false);
    }
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={exercise !== null}
      onClose={onClose}
      onOpen={() => {}}
      PaperProps={{sx: {borderRadius: '16px 16px 0 0', maxHeight: '85dvh', overflowY: 'auto', p: 2}}}
      disableDiscovery
      disableSwipeToOpen
    >
      {exercise && (
        <Box>
          {/* Drag handle */}
          <Box sx={{width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2}}/>

          {/* Name */}
          <Typography variant="h6" sx={{mb: 1}}>
            {exercise.name}
          </Typography>

          {/* Muscle chips */}
          {exercise.primaryMuscles.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5}}>
              {exercise.primaryMuscles.map(m => (
                <Chip key={m} label={toTitleCase(m)} size="small" color="primary" variant="outlined" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}
          {exercise.secondaryMuscles.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1}}>
              {exercise.secondaryMuscles.map(m => (
                <Chip key={m} label={toTitleCase(m)} size="small" color="warning" variant="outlined" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}

          {/* Equipment chips */}
          {exercise.equipment.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2}}>
              {exercise.equipment.map(eq => (
                <Chip key={eq} label={toTitleCase(eq)} size="small" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}

          {/* Anatomy */}
          {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
            <Box sx={{height: 120, mb: 2}}>
              <MuscleHighlight
                primaryMuscles={exercise.primaryMuscles}
                secondaryMuscles={exercise.secondaryMuscles}
                exerciseId={exercise.id}
              />
            </Box>
          )}

          {/* Coach section */}
          {isCoachPortal ? (
            <Box sx={{mb: 2}}>
              <Typography variant="subtitle2" sx={{mb: 1}}>
                Notes for clients
              </Typography>
              <TextField
                multiline
                fullWidth
                minRows={3}
                maxRows={6}
                placeholder="Add custom notes your clients will see for this exercise..."
                value={coachDraft}
                onChange={e => setCoachDraft(e.target.value)}
                size="small"
                inputProps={{'aria-label': 'Notes for clients'}}
              />
              <TextField
                fullWidth
                label="Reference URL"
                placeholder="https://www.youtube.com/watch?v=..."
                value={coachUrlDraft}
                onChange={e => setCoachUrlDraft(e.target.value)}
                size="small"
                sx={{mt: 1}}
                inputProps={{'aria-label': 'Reference URL'}}
              />
              <Box sx={{display: 'flex', gap: 1, mt: 1}}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={saving || (coachDraft.trim().length === 0 && coachUrlDraft.trim().length === 0)}
                >
                  Save
                </Button>
                {(coachNote?.note || coachNote?.url) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleClear}
                    disabled={saving}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </Box>
          ) : coachNote?.note || coachNote?.url ? (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'secondary.light',
                bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'secondary.50',
              }}
            >
              <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75}}>
                <SchoolIcon sx={{fontSize: '0.9rem', color: 'secondary.main'}}/>
                <Typography variant="caption" color="secondary.main" sx={{fontWeight: 600}}>
                  From your coach
                </Typography>
              </Box>
              {coachNote?.note && (
                <Typography variant="body2" color="text.primary">
                  {coachNote.note}
                </Typography>
              )}
              {coachNote?.url && (
                <Button
                  component="a"
                  href={coachNote.url}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  startIcon={<LinkIcon fontSize="small"/>}
                  sx={{mt: coachNote.note ? 1 : 0}}
                >
                  Open coach link
                </Button>
              )}
            </Box>
          ) : null}

          {!isCoachPortal && (
            <Box sx={{mb: 2}}>
              <Typography variant="subtitle2" sx={{mb: 1}}>
                Your exercise notes
              </Typography>
              <TextField
                multiline
                fullWidth
                minRows={3}
                maxRows={6}
                placeholder="Add your own notes for this exercise..."
                value={userNoteDraft}
                onChange={e => setUserNoteDraft(e.target.value)}
                onBlur={handleUserNoteBlur}
                size="small"
                disabled={userSaving}
                inputProps={{'aria-label': 'Your exercise notes'}}
              />
            </Box>
          )}

          {/* E1RM history chart */}
          <Typography variant="subtitle2" sx={{mb: 0.5}}>
            Est. 1RM Progress
          </Typography>
          <E1rmChart exercise={exercise}/>
        </Box>
      )}
    </SwipeableDrawer>
  );
}
