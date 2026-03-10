'use client';

import {useState} from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import {WorkoutExercisePrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@prisma/client';

export type PreviousCardio = {
  cardioDuration: number | null;
  cardioDistance: number | null;
  cardioResistance: number | null;
};

function formatPace(durationMin: number, distanceKm: number): string {
  const paceMin = durationMin / distanceKm;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

export default function CardioSlide({
  ex,
  userExerciseNote,
  onFormCueBlur,
  onCardioUpdate,
  previousCardio,
}: {
  ex: WorkoutExercisePrisma;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  onCardioUpdate: (field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
  previousCardio: PreviousCardio | null | undefined;
}) {
  const [formCue, setFormCue] = useState(userExerciseNote?.note ?? '');
  const [formCueOpen, setFormCueOpen] = useState(false);

  const hasFormCue = formCue.trim().length > 0;

  const duration = ex.cardioDuration;
  const distance = ex.cardioDistance;
  const resistance = ex.cardioResistance;

  const pace = duration && distance && duration > 0 && distance > 0
    ? formatPace(duration, distance)
    : null;

  const prevSummary = (() => {
    if (!previousCardio) return null;
    const parts: string[] = [];
    if (previousCardio.cardioDuration != null) parts.push(`${previousCardio.cardioDuration} min`);
    if (previousCardio.cardioDistance != null) parts.push(`${previousCardio.cardioDistance} km`);
    return parts.length > 0 ? parts.join(' · ') : null;
  })();

  const handleNumberInput = (
    field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance',
    raw: string
  ) => {
    if (raw === '') {
      onCardioUpdate(field, null);
      return;
    }
    const n = parseFloat(raw);
    if (!isNaN(n)) onCardioUpdate(field, n);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        mx: 1,
        boxSizing: 'border-box',
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{mb: 1}}>
        <Typography variant="h6">{ex.exercise.name}</Typography>
        <Box
          sx={{display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5}}
          onClick={() => setFormCueOpen(o => !o)}
        >
          <IconButton size="small" color={hasFormCue ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {formCueOpen || hasFormCue ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={hasFormCue ? 'primary' : 'text.secondary'}>
            Your exercise notes
          </Typography>
        </Box>
      </Box>

      {/* Form cue */}
      <Collapse in={formCueOpen} sx={{width: '100%', mb: 1}}>
        <TextField
          multiline
          fullWidth
          minRows={2}
          maxRows={4}
          placeholder="Add form cues and notes for this exercise..."
          value={formCue}
          onChange={e => setFormCue(e.target.value)}
          onBlur={() => onFormCueBlur(ex.exerciseId, formCue)}
          size="small"
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {borderColor: 'warning.main'},
            },
          }}
        />
      </Collapse>

      {/* Previous session */}
      {prevSummary !== null && (
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
          Last session: {prevSummary}
        </Typography>
      )}

      {/* Inputs */}
      <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 1}}>
        <TextField
          label="Duration (min)"
          size="small"
          autoComplete="off"
          inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
          value={duration?.toString() ?? ''}
          onChange={e => handleNumberInput('cardioDuration', e.target.value)}
          sx={{'& input': {textAlign: 'center'}}}
        />
        <TextField
          label="Distance (km)"
          size="small"
          autoComplete="off"
          inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
          value={distance?.toString() ?? ''}
          onChange={e => handleNumberInput('cardioDistance', e.target.value)}
          sx={{'& input': {textAlign: 'center'}}}
        />
        <TextField
          label="Avg. Resistance / Incline"
          size="small"
          autoComplete="off"
          inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
          value={resistance?.toString() ?? ''}
          onChange={e => handleNumberInput('cardioResistance', e.target.value)}
          sx={{'& input': {textAlign: 'center'}}}
        />
      </Box>

      {/* Pace */}
      {pace && (
        <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
          Pace: {pace}
        </Typography>
      )}
    </Paper>
  );
}
