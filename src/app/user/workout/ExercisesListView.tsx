'use client';

import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
  TextField,
  Typography
} from '@mui/material';
import {DatePicker} from '@mui/x-date-pickers';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {WorkoutPrisma} from '@/types/dataTypes';
import './exercisesListView.css'
import {useAppBar} from '@lib/providers/AppBarProvider';
import {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';
import AppBarStopwatch from "@/app/user/workout/AppBarStopwatch";
import ScrollEdgeFades from '@/components/ScrollEdgeFades';
import { useScrollEdgeFades } from '@lib/hooks/useScrollEdgeFades';

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
  useAppBar({title: workout.name, showBack: true, onBack});
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(workout.notes ?? '');

  const { scrollRef: listRef, handleScroll: handleListScroll, showStartFade, showEndFade } =
    useScrollEdgeFades<HTMLUListElement>({ axis: 'y', threshold: 4 });

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
        <Box sx={{display: 'flex', alignItems: 'center'}}>
          <Typography variant="subtitle1" sx={{flex: 1}}>
            Exercises
          </Typography>
          <IconButton size="small" onClick={onAddExercise} aria-label="Add exercise">
            <AddIcon fontSize="small"/>
          </IconButton>
        </Box>
        <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <List
            ref={listRef}
            className={"maskedOverflow"}
            onScroll={() => handleListScroll()}
            sx={{
              flex: 1,
              height: '100%',
              minHeight: 0,
              py: 0,
              overflowY: 'auto',
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
                <ListItemButton onClick={() => onSelectExercise(ex.id)} sx={{flex: 1}}>
                  <Box sx={{flex: 1, minWidth: 0}}>
                    {/* Line 1: name + chips */}
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap'}}>
                      <Typography variant="body2" sx={{fontWeight: 500}}>
                        {ex.exercise.name}
                      </Typography>
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
                    {/* Line 2: meta left, indicators right */}
                    <Box sx={{display: 'flex', alignItems: 'center', mt: 0.25}}>
                      {ex.exercise.category === 'cardio' ? (
                        ex.cardioDuration != null || ex.cardioDistance != null ? (
                          <Typography variant="caption" color="text.secondary">
                            {[
                              ex.cardioDuration != null ? `${ex.cardioDuration} min` : null,
                              ex.cardioDistance != null ? `${ex.cardioDistance} km` : null,
                            ].filter(Boolean).join(' · ')}
                          </Typography>
                        ) : (
                          <PanoramaFishEyeIcon sx={{fontSize: '1.1rem', color: 'text.secondary'}}/>
                        )
                      ) : (
                        <>
                          {(() => {
                            const metaParts = [
                              ex.repRange ? `${ex.repRange.replaceAll('-', ' - ')} reps` : null,
                              ex.restTime ?
                                `${ex.restTime.endsWith('s') ? ex.restTime : `${ex.restTime}s`} rest`
                                : null,
                            ].filter(Boolean).join(' · ');
                            return metaParts ? (
                              <Typography variant="caption" color="text.secondary">{metaParts}</Typography>
                            ) : null;
                          })()}
                          <Box sx={{flex: 1}}/>
                          <Box sx={{display: 'flex', alignItems: 'center'}}>
                            {ex.sets.map((set, idx) => {
                              const iconSx = set.isDropSet ? {fontSize: '0.85rem'} : {fontSize: '1.1rem'};
                              return set.reps
                                ? <TaskAltIcon key={idx} sx={iconSx}/>
                                : <PanoramaFishEyeIcon key={idx} sx={iconSx}/>;
                            })}
                          </Box>
                        </>
                      )}
                    </Box>
                    {isSubstituted && ex.substitutedFor && (
                      <Typography variant="caption" color="warning.main" sx={{display: 'block', mt: 0.25}}>
                        Originally: {ex.substitutedFor.name}
                      </Typography>
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
                    <DeleteOutlineIcon fontSize="small"/>
                  </IconButton>
                )}
              </ListItem>
            );
          })}
          </List>
          <ScrollEdgeFades axis="y" showStart={showStartFade} showEnd={showEndFade} size={40} background="default" />
        </Box>
        <Box
          sx={{display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1}}
          onClick={() => setNotesOpen(o => !o)}
        >
          <IconButton size="small" color={notesOpen || hasNote ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {notesOpen || hasNote ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={notesOpen || hasNote ? 'primary' : 'text.secondary'}>
            Workout notes
          </Typography>
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
