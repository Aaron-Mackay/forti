'use client';

import {useEffect, useState} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {Exercise} from '@/generated/prisma/browser';
import {APPBAR_HEIGHT, HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';

export interface AddExerciseConfig {
  setCount: number;
  repRange: string;
  restTime: string;
}

interface AddExerciseConfigDialogProps {
  open: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onConfirm: (config: AddExerciseConfig) => void;
}

const DEFAULT_SET_COUNT = 3;
const DEFAULT_REP_RANGE = '8-12';
const DEFAULT_REST_TIME = '90';

export default function AddExerciseConfigDialog({
  open,
  exercise,
  onClose,
  onConfirm,
}: AddExerciseConfigDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [setCount, setSetCount] = useState(DEFAULT_SET_COUNT);
  const [repRange, setRepRange] = useState(DEFAULT_REP_RANGE);
  const [restTime, setRestTime] = useState(DEFAULT_REST_TIME);

  // Reset to defaults whenever a new exercise is selected
  useEffect(() => {
    if (exercise) {
      setSetCount(DEFAULT_SET_COUNT);
      setRepRange(DEFAULT_REP_RANGE);
      setRestTime(DEFAULT_REST_TIME);
    }
  }, [exercise]);

  const handleConfirm = () => {
    onConfirm({setCount, repRange, restTime});
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      slotProps={fullScreen ? {paper: {sx: {mt: `${APPBAR_HEIGHT}px`, height: HEIGHT_EXC_APPBAR}}} : undefined}
    >
      <DialogTitle>
        Configure Exercise
        {exercise && (
          <Typography variant="subtitle2" color="text.secondary" sx={{mt: 0.25}}>
            {exercise.name}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{mb: 2}}>
          <Typography variant="body2" gutterBottom>Sets</Typography>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <IconButton
              size="small"
              onClick={() => setSetCount(c => Math.max(1, c - 1))}
              aria-label="Decrease sets"
              disabled={setCount <= 1}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="body1" sx={{minWidth: 24, textAlign: 'center'}}>
              {setCount}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setSetCount(c => Math.min(10, c + 1))}
              aria-label="Increase sets"
              disabled={setCount >= 10}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <TextField
          label="Rep Range"
          value={repRange}
          onChange={e => setRepRange(e.target.value)}
          size="small"
          fullWidth
          sx={{mb: 2}}
          inputProps={{'aria-label': 'Rep range'}}
        />
        <TextField
          label="Rest Time (seconds)"
          value={restTime}
          onChange={e => setRestTime(e.target.value)}
          size="small"
          fullWidth
          inputProps={{inputMode: 'numeric', 'aria-label': 'Rest time'}}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}
