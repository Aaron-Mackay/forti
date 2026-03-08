'use client';

import {useState} from 'react';
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MuscleHighlight from '@/components/MuscleHighlight';
import E1rmSparkline from './E1rmSparkline';
import {computeE1rm} from '@/lib/e1rm';
import {SetPrisma, WorkoutExercisePrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@prisma/client';
import type {E1rmHistoryPoint} from '@/app/api/exercises/[exerciseId]/e1rm-history/route';

export type PreviousSet = { weight: number | null; reps: number | null; order: number };

export default function ExerciseSlide({
  ex,
  userExerciseNote,
  onFormCueBlur,
  handleSetUpdate,
  previousSets,
  history,
}: {
  ex: WorkoutExercisePrisma;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  previousSets: PreviousSet[] | undefined;
  history: E1rmHistoryPoint[] | null;
}) {
  const [formCue, setFormCue] = useState(userExerciseNote?.note ?? '');
  const [formCueOpen, setFormCueOpen] = useState(false);
  const [hasScrollBelow, setHasScrollBelow] = useState(true);
  const [hasScrollAbove, setHasScrollAbove] = useState(false);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setHasScrollAbove(el.scrollTop > 4);
    setHasScrollBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  const hasFormCue = formCue.trim().length > 0;

  const todayBestE1rm = ex.sets.reduce<number | null>((best, set) => {
    const e = computeE1rm(set.weight, set.reps);
    return e === null ? best : best === null ? e : Math.max(best, e);
  }, null);

  const historicalBest = history && history.length > 0
    ? Math.max(...history.map(p => p.bestE1rm))
    : null;

  const isNewBest = todayBestE1rm !== null && historicalBest !== null
    && todayBestE1rm > historicalBest;

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        maxWidth: '100',
        mx: 1,
        boxSizing: 'border-box',
        p: 2,
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header row: name/rest/reps/notes toggle on left, anatomy on right */}
      <Box sx={{display: 'flex', alignItems: 'stretch', width: '100%', mb: 1}}>
        <Box sx={{flex: 1}}>
          <Typography variant="h6">
            {ex.exercise.name}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Rest: {ex.restTime}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Reps: {ex.repRange}
          </Typography>
          <Box
            sx={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}
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
        <MuscleHighlight primaryMuscles={ex.exercise.primaryMuscles} secondaryMuscles={ex.exercise.secondaryMuscles}
                         exerciseId={ex.exerciseId}/>
      </Box>

      {/* E1RM sparkline */}
      <E1rmSparkline
        exerciseId={ex.exerciseId}
        history={history}
        todayE1RM={todayBestE1rm}
        isNewBest={isNewBest}
      />

      {/* Form cue textarea */}
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
              borderColor: 'warning.main',
              '&.Mui-focused fieldset': {borderColor: 'warning.main'},
            },
          }}
        />
      </Collapse>

      <Box sx={{position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
        <Box onScroll={handleListScroll} sx={{flex: 1, minHeight: 0, overflowY: 'auto', width: '100%'}}>
          <List sx={{width: '100%'}}>
            {ex.sets.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                No sets recorded.
              </Typography>
            )}
            {ex.sets.map((set: SetPrisma, setIdx) => {
            const prev = previousSets?.find(s => s.order === set.order);
            const liveE1rm = computeE1rm(set.weight, set.reps);
            return (
              <ListItem key={set.id} disablePadding sx={{alignItems: 'flex-start', mb: 1, flexDirection: 'column'}}>
                <Box sx={{display: 'flex', alignItems: 'flex-end', width: '100%', gap: 1}}>
                  <Box>
                    <ListItemText primary={`Set ${setIdx + 1}`} sx={{minWidth: 60, flex: 'none', mr: 2}}/>
                    {previousSets === undefined ? (
                      <Skeleton variant="text" width={70} height={21} sx={{mt: 0.25}}/>
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{mt: 0.25, visibility: prev ? 'visible' : 'hidden', width: 70}}
                        aria-label={prev ? `Previous: ${prev.weight ?? '—'} × ${prev.reps ?? '—'}` : undefined}
                      >
                        Prev: {prev?.weight ?? '—'} × {prev?.reps ?? '—'}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="Weight"
                    size="small"
                    autoComplete="off"
                    value={set.weight?.toString() ?? ''}
                    onChange={(e) => {
                      handleSetUpdate(setIdx, 'weight', e.target.value)
                    }}
                    sx={{
                      minWidth: 80,
                      '& input': {textAlign: 'center'}
                    }}
                  />
                  <TextField
                    label="Reps"
                    type="text"
                    size="small"
                    autoComplete="off"
                    value={set.reps ?? ''}
                    onChange={(e) => {
                      if (!/^\d*$/.test(e.target.value)) return;
                      handleSetUpdate(setIdx, 'reps', e.target.value);
                    }}
                    sx={{
                      minWidth: 60,
                      '& input': {textAlign: 'center'}
                    }}
                    inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                  />
                  <Box>
                    <TextField
                      label="Est. 1RM"
                      size="small"
                      disabled
                      slotProps={{inputLabel: {shrink: true}}}
                      sx={{
                        minWidth: 75,
                        '& input': {textAlign: 'center'}
                      }}
                      value={liveE1rm ? liveE1rm.toFixed(1) : "-"}
                    />
                    {liveE1rm !== null && liveE1rm === todayBestE1rm && liveE1rm > (historicalBest || 0) && (
                      <EmojiEventsIcon
                        sx={{
                          position: 'absolute',
                          right: "0",
                          bottom: "-12px",
                          pointerEvents: 'none',
                          color: 'gold',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </ListItem>
            );
            })}
          </List>
        </Box>
        {hasScrollAbove && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 48,
              background: theme => `linear-gradient(to top, ${alpha(theme.palette.background.paper, 0)}, ${theme.palette.background.paper})`,
              pointerEvents: 'none',
            }}
          />
        )}
        {hasScrollBelow && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 48,
              background: theme => `linear-gradient(to bottom, ${alpha(theme.palette.background.paper, 0)}, ${theme.palette.background.paper})`,
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    </Paper>
  );
}
