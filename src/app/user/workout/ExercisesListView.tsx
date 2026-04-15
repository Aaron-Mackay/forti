'use client';

import {useRef, useState} from 'react';
import {alpha} from '@mui/material/styles';
import {
  Box,
  Button,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import {DatePicker} from '@mui/x-date-pickers';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {Chip} from '@mui/material';
import {WorkoutPrisma} from '@/types/dataTypes';
import './exercisesListView.css'
import { useAppBar } from '@lib/providers/AppBarProvider';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import AppBarStopwatch from "@/app/user/workout/AppBarStopwatch";

export default function ExercisesListView({
                                            workout,
                                            onBack,
                                            onSelectExercise,
                                            onWorkoutNoteBlur,
                                            onCompleteWorkout,
                                            onAddExercise,
                                            onRemoveExercise,
                                          }: {
  workout: WorkoutPrisma;
  onBack: () => void;
  onSelectExercise: (exerciseId: number) => void;
  onWorkoutNoteBlur: (note: string) => void;
  onCompleteWorkout: (completed: boolean, date?: Date) => void;
  onAddExercise: () => void;
  onRemoveExercise?: (workoutExerciseId: number) => void;
}) {
  useAppBar({ title: workout.name, showBack: true, onBack });
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(workout.notes ?? '');

  const [hasScrollAbove, setHasScrollAbove] = useState(false);
  const [hasScrollBelow, setHasScrollBelow] = useState(true);

  const handleListScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    setHasScrollAbove(el.scrollTop > 4);
    setHasScrollBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const LONG_PRESS_MS = 600;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCompleteBtnPointerDown = () => {
    clearLongPress();
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPickedDate(workout.dateCompleted ? new Date(workout.dateCompleted) : new Date());
      setDatePickerOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleCompleteBtnClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onCompleteWorkout(!isCompleted);
  };

  const hasNote = noteValue.trim().length > 0;
  const isCompleted = !!workout.dateCompleted;
  const completedDate = workout.dateCompleted
    ? new Date(workout.dateCompleted).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
    : null;

  return (
    <Box sx={{
      height: HEIGHT_EXC_APPBAR,
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Container
        maxWidth="sm"
        sx={{
          pt: 2,
          pb: 'max(16px, calc(16px + env(safe-area-inset-bottom)))',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center', mb: 1}}>
          <Typography variant="subtitle1" sx={{flex: 1}}>
            Exercises
          </Typography>
          <IconButton
            size="small"
            onClick={() => setNotesOpen(o => !o)}
            color={hasNote ? 'primary' : 'default'}
            aria-label="Toggle workout notes"
          >
            {notesOpen || hasNote ? <EditIcon fontSize="small"/> : <EditOutlinedIcon fontSize="small"/>}
          </IconButton>
        </Box>
        <Collapse in={notesOpen}>
          <TextField
            multiline
            fullWidth
            minRows={2}
            maxRows={5}
            placeholder="Workout notes..."
            value={noteValue}
            onChange={e => setNoteValue(e.target.value)}
            onBlur={() => onWorkoutNoteBlur(noteValue)}
            size="small"
            sx={{mb: 1}}
          />
        </Collapse>
        <Box sx={{position: 'relative', flex: 1, minHeight: 0, mb: 2}}>
        <List
          className={"maskedOverflow"}
          onScroll={handleListScroll}
          sx={{
            height: '100%',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {workout.exercises.map((ex) => {
            const isSubstituted = ex.substitutedForId != null;
            const isAdded = ex.isAdded;
            return (
              <ListItem
                key={ex.id}
                disablePadding
                sx={{
                  borderLeft: isSubstituted ? '3px solid' : isAdded ? '3px solid' : 'none',
                  borderColor: isSubstituted ? 'warning.main' : 'info.main',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ListItemButton onClick={() => onSelectExercise(ex.id)} sx={{display: 'flex', alignItems: 'center', flex: 1}}>
                  <Box sx={{flex: 1}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap'}}>
                      <ListItemText primary={ex.exercise.name} sx={{m: 0, flex: 'none'}} />
                      {ex.isBfr && (
                        <Chip
                          label="BFR"
                          size="small"
                          color="warning"
                          sx={{height: 18, fontSize: '0.65rem'}}
                        />
                      )}
                      {isSubstituted && (
                        <Chip
                          label="Sub"
                          size="small"
                          color="warning"
                          variant="outlined"
                          title={ex.substitutedFor ? `Originally: ${ex.substitutedFor.name}` : undefined}
                          sx={{height: 18, fontSize: '0.65rem'}}
                        />
                      )}
                      {isAdded && (
                        <Chip
                          label="Added"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{height: 18, fontSize: '0.65rem'}}
                        />
                      )}
                    </Box>
                    {isSubstituted && ex.substitutedFor && (
                      <Typography variant="caption" color="warning.main" sx={{display: 'block'}}>
                        Originally: {ex.substitutedFor.name}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{display: 'flex', alignItems: 'center', ml: 2}}>
                    {ex.exercise.category === 'cardio' ? (
                      ex.cardioDuration != null || ex.cardioDistance != null ? (
                        <Typography variant="caption" color="text.secondary">
                          {[
                            ex.cardioDuration != null ? `${ex.cardioDuration} min` : null,
                            ex.cardioDistance != null ? `${ex.cardioDistance} km` : null,
                          ].filter(Boolean).join(' · ')}
                        </Typography>
                      ) : (
                        <PanoramaFishEyeIcon />
                      )
                    ) : (
                      ex.sets.map((set, idx) => {
                        const iconSx = set.isDropSet ? {fontSize: '0.85rem'} : undefined;
                        return set.reps
                          ? <TaskAltIcon key={idx} sx={iconSx}/>
                          : <PanoramaFishEyeIcon key={idx} sx={iconSx}/>;
                      })
                    )}
                  </Box>
                </ListItemButton>
                {isAdded && onRemoveExercise && (
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Remove exercise"
                    onClick={() => onRemoveExercise(ex.id)}
                    sx={{mr: 0.5}}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItem>
            );
          })}
        </List>
        {hasScrollAbove && (
          <Box
            sx={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 40,
              background: theme => `linear-gradient(to top, ${alpha(theme.palette.background.default, 0)}, ${theme.palette.background.default})`,
              pointerEvents: 'none',
            }}
          />
        )}
        {hasScrollBelow && (
          <Box
            sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
              background: theme => `linear-gradient(to bottom, ${alpha(theme.palette.background.default, 0)}, ${theme.palette.background.default})`,
              pointerEvents: 'none',
            }}
          />
        )}
        </Box>
        <Button
          variant="outlined"
          fullWidth
          onClick={onAddExercise}
          startIcon={<AddIcon />}
          sx={{mb: 1}}
        >
          Add Exercise
        </Button>
        <span
          onPointerDown={handleCompleteBtnPointerDown}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          style={{display: 'block', marginBottom: 8}}
        >
          <Button
            variant={isCompleted ? 'contained' : 'outlined'}
            color="success"
            fullWidth
            onClick={handleCompleteBtnClick}
            startIcon={isCompleted ? <CheckCircleIcon/> : <CheckCircleOutlineIcon/>}
          >
            {isCompleted ? `Completed ${completedDate}` : 'Mark as Complete'}
          </Button>
        </span>
        <Dialog open={datePickerOpen} onClose={() => setDatePickerOpen(false)}>
          <DialogTitle>Complete Workout</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{mb: 2}}>Select a completion date:</Typography>
            <DatePicker
              value={pickedDate}
              onChange={setPickedDate}
              disableFuture
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDatePickerOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setDatePickerOpen(false);
                if (pickedDate) onCompleteWorkout(true, pickedDate);
              }}
            >
              Complete
            </Button>
          </DialogActions>
        </Dialog>
        <AppBarStopwatch/>
      </Container>
    </Box>
  );
}
