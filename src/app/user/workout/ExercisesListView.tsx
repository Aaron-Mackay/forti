'use client';

import {useState} from 'react';
import {
  Box,
  Button,
  Collapse,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
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
  onCompleteWorkout: (completed: boolean) => void;
  onAddExercise: () => void;
  onRemoveExercise?: (workoutExerciseId: number) => void;
}) {
  useAppBar({ title: workout.name, showBack: true, onBack });
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(workout.notes ?? '');

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
        <List
          className={"maskedOverflow"}
          sx={{
            flex: 1,
            overflowY: 'auto',
            mb: 2,
            minHeight: 0
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
        <Button
          variant="outlined"
          fullWidth
          onClick={onAddExercise}
          startIcon={<AddIcon />}
          sx={{mb: 1}}
        >
          Add Exercise
        </Button>
        <Button
          variant={isCompleted ? 'contained' : 'outlined'}
          color="success"
          fullWidth
          onClick={() => onCompleteWorkout(!isCompleted)}
          startIcon={isCompleted ? <CheckCircleIcon/> : <CheckCircleOutlineIcon/>}
          sx={{mb: 1}}
        >
          {isCompleted ? `Completed ${completedDate}` : 'Mark as Complete'}
        </Button>
        <AppBarStopwatch/>
      </Container>
    </Box>
  );
}
