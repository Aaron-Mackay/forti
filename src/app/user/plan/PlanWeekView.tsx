'use client';

import React, { useEffect, useState } from 'react';
import { Box, Chip, Collapse, IconButton, LinearProgress, TextField, Tooltip, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { getWorkoutStatus } from '@/lib/workoutProgress';
import ExerciseProgressCard from './ExerciseProgressCard';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import { getLatestTrackedWeekIndex, getPreviousTrackedExercise, stripWorkoutSuffix } from './planPresentation';

interface PlanWeekViewProps {
  plan: PlanPrisma;
  planId: number;
  hideWeekNavigationWhenSingleWeek?: boolean;
  showProgress?: boolean;
}

const PlanWeekView = ({
  plan,
  planId,
  hideWeekNavigationWhenSingleWeek = false,
  showProgress = true,
}: PlanWeekViewProps) => {
  const { dispatch, debouncedDispatch } = useWorkoutEditorContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ weekId: number; workoutId: number } | null>(null);
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);

  // Default to the latest week that has any weight/reps entered, or the last week
  const defaultWeekIdx = getLatestTrackedWeekIndex(plan);

  const [weekIdx, setWeekIdx] = useState(defaultWeekIdx);
  const [selectedWorkoutIdx, setSelectedWorkoutIdx] = useState(0);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const week = sortedWeeks[weekIdx];
  if (!week) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No weeks in this plan yet.
      </Typography>
    );
  }

  const sortedWorkouts = [...week.workouts].sort((a, b) => a.order - b.order);
  const workout = sortedWorkouts[selectedWorkoutIdx] ?? sortedWorkouts[0] ?? null;

  const doneCount = sortedWorkouts.filter(w => getWorkoutStatus(w) === 'completed').length;
  const progress = sortedWorkouts.length > 0 ? doneCount / sortedWorkouts.length : 0;

  const sortedExercises = workout
    ? [...workout.exercises].sort((a, b) => a.order - b.order)
    : [];

  useEffect(() => {
    setNotesExpanded(false);
  }, [workout?.id]);

  return (
    <Box sx={{ pb: 8 }}>
      {/* Week navigation */}
      {(!hideWeekNavigationWhenSingleWeek || sortedWeeks.length > 1) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <IconButton
            size="small"
            disabled={weekIdx === 0}
            onClick={() => { setWeekIdx(i => i - 1); setSelectedWorkoutIdx(0); }}
            aria-label="Previous week"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              Wk {week.order} of {sortedWeeks.length}
            </Typography>
            {sortedWeeks.length > 1 && (
              <IconButton
                size="small"
                onClick={() => {
                  dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id });
                  setWeekIdx((prev) => Math.max(0, Math.min(prev, sortedWeeks.length - 2)));
                  setSelectedWorkoutIdx(0);
                }}
                aria-label="Delete week"
                sx={{ color: 'text.secondary' }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          <IconButton
            size="small"
            onClick={() => {
              if (weekIdx === sortedWeeks.length - 1) {
                dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: week.id });
                setWeekIdx(sortedWeeks.length);
                setSelectedWorkoutIdx(0);
                return;
              }
              setWeekIdx(i => i + 1);
              setSelectedWorkoutIdx(0);
            }}
            aria-label={weekIdx === sortedWeeks.length - 1 ? 'Add week' : 'Next week'}
          >
            {weekIdx === sortedWeeks.length - 1 ? <AddIcon fontSize="small" /> : <ArrowForwardIosIcon fontSize="small" />}
          </IconButton>
        </Box>
      )}

      {/* Progress bar */}
      {showProgress && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {doneCount}/{sortedWorkouts.length} workouts done
          </Typography>
        </Box>
      )}

      {/* Workout chips + add workout */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 2, alignItems: 'center' }}>
        {sortedWorkouts.map((w, i) => (
          <Chip
            key={w.id}
            label={w.name ? stripWorkoutSuffix(w.name) : `Workout ${w.order}`}
            onClick={() => setSelectedWorkoutIdx(i)}
            variant={selectedWorkoutIdx === i ? 'filled' : 'outlined'}
            color={selectedWorkoutIdx === i ? 'primary' : 'default'}
            size="small"
            sx={{ flexShrink: 0, cursor: 'pointer' }}
          />
        ))}
        <Chip
          label="+ Workout"
          onClick={() => {
            setSelectedWorkoutIdx(sortedWorkouts.length); // index of the workout about to be created
            dispatch({ type: 'ADD_WORKOUT', planId, weekId: week.id });
          }}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed' }}
        />
      </Box>

      {/* Editable workout name */}
      {workout && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              label="Workout name"
              value={workout.name ?? ''}
              onChange={(e) =>
                debouncedDispatch({
                  type: 'UPDATE_WORKOUT_NAME',
                  planId,
                  weekId: week.id,
                  workoutId: workout.id,
                  name: e.target.value,
                })
              }
              sx={{ width: '100%', maxWidth: 320 }}
              autoComplete="off"
            />
            <IconButton
              size="small"
              disabled={sortedWorkouts.length <= 1}
              onClick={() => {
                dispatch({ type: 'REMOVE_WORKOUT', planId, weekId: week.id, workoutId: workout.id });
                setSelectedWorkoutIdx((prev) => Math.max(0, Math.min(prev, sortedWorkouts.length - 2)));
              }}
              aria-label="Delete workout"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NotesOutlinedIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                Workout notes
              </Typography>
              <Tooltip title={notesExpanded ? 'Collapse notes' : 'Expand notes'}>
                <IconButton
                  size="small"
                  onClick={() => setNotesExpanded((prev) => !prev)}
                  aria-label={notesExpanded ? 'Collapse workout notes' : 'Expand workout notes'}
                >
                  {notesExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            {!notesExpanded && Boolean(workout.notes?.trim()) && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => setNotesExpanded(true)}
              >
                {workout.notes}
              </Typography>
            )}

            <Collapse in={notesExpanded || !workout.notes?.trim()} unmountOnExit={false}>
              <TextField
                size="small"
                placeholder="Add workout notes..."
                value={workout.notes ?? ''}
                onChange={(event) =>
                  debouncedDispatch({
                    type: 'UPDATE_WORKOUT_NOTES',
                    planId,
                    weekId: week.id,
                    workoutId: workout.id,
                    notes: event.target.value,
                  })
                }
                multiline
                minRows={2}
                fullWidth
                sx={{ mt: 0.5 }}
              />
            </Collapse>
          </Box>
        </Box>
      )}

      {/* Exercises */}
      {workout && sortedExercises.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          No exercises yet.
        </Typography>
      )}

      {workout &&
        sortedExercises.map((exerciseLink, i) => (
          <ExerciseProgressCard
            key={exerciseLink.id}
            exerciseLink={exerciseLink}
            prevExercise={getPreviousTrackedExercise(
              plan,
              week.order,
              workout.order,
              exerciseLink.exercise?.id ?? -1,
            )}
            index={i}
            planId={planId}
            weekId={week.id}
            workoutId={workout.id}
            isFirst={i === 0}
            isLast={i === sortedExercises.length - 1}
          />
        ))}

      {/* + Exercise — centred */}
      {workout && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              setPickerTarget({ weekId: week.id, workoutId: workout.id });
              setPickerOpen(true);
            }}
          >
            + Exercise
          </Typography>
        </Box>
      )}

      <ExercisePickerDialog
        open={pickerOpen}
        title="Add Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setPickerOpen(false);
          if (pickerTarget) {
            dispatch({
              type: 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE',
              planId,
              weekId: pickerTarget.weekId,
              workoutId: pickerTarget.workoutId,
              exercise,
            });
          }
        }}
      />
    </Box>
  );
};

export default PlanWeekView;
