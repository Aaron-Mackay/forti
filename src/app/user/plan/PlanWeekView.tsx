'use client';

import React, { useState } from 'react';
import { Box, Chip, IconButton, LinearProgress, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { PlanPrisma, WorkoutExercisePrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { getWorkoutStatus } from '@/lib/workoutProgress';
import ExerciseProgressCard from './ExerciseProgressCard';

/** Strips trailing parenthetical from workout names, e.g. "Workout 1 (Plan 1 - Week 2)" → "Workout 1" */
function stripSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function getPrevExercise(
  plan: PlanPrisma,
  currentWeekOrder: number,
  workoutOrder: number,
  exerciseId: number,
): WorkoutExercisePrisma | null {
  const prevWeek = plan.weeks.find(w => w.order === currentWeekOrder - 1);
  const workout = prevWeek?.workouts.find(w => w.order === workoutOrder);
  return workout?.exercises.find(e => e.exercise?.id === exerciseId) ?? null;
}

interface PlanWeekViewProps {
  plan: PlanPrisma;
  planId: number;
}

const PlanWeekView = ({ plan, planId }: PlanWeekViewProps) => {
  const { dispatch } = useWorkoutEditorContext();
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);

  // Default to the latest week that has any weight/reps entered, or the last week
  const defaultWeekIdx = (() => {
    let last = -1;
    sortedWeeks.forEach((w, i) => {
      const hasData = w.workouts.some(wo =>
        wo.exercises.some(ex =>
          ex.sets.some(s => s.weight != null || (s.reps != null && s.reps > 0))
        )
      );
      if (hasData) last = i;
    });
    return last >= 0 ? last : Math.max(0, sortedWeeks.length - 1);
  })();

  const [weekIdx, setWeekIdx] = useState(defaultWeekIdx);
  const [selectedWorkoutIdx, setSelectedWorkoutIdx] = useState(0);

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

  return (
    <Box sx={{ pb: 8 }}>
      {/* Week navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <IconButton
          size="small"
          disabled={weekIdx === 0}
          onClick={() => { setWeekIdx(i => i - 1); setSelectedWorkoutIdx(0); }}
          aria-label="Previous week"
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>

        <Typography variant="body2" fontWeight={600}>
          Wk {week.order} of {sortedWeeks.length}
        </Typography>

        <IconButton
          size="small"
          disabled={weekIdx === sortedWeeks.length - 1}
          onClick={() => { setWeekIdx(i => i + 1); setSelectedWorkoutIdx(0); }}
          aria-label="Next week"
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Progress bar */}
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

      {/* Workout chips + add workout */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 2, alignItems: 'center' }}>
        {sortedWorkouts.map((w, i) => (
          <Chip
            key={w.id}
            label={w.name ? stripSuffix(w.name) : `Workout ${w.order}`}
            onClick={() => setSelectedWorkoutIdx(i)}
            variant={selectedWorkoutIdx === i ? 'filled' : 'outlined'}
            color={selectedWorkoutIdx === i ? 'primary' : 'default'}
            size="small"
            sx={{ flexShrink: 0, cursor: 'pointer' }}
          />
        ))}
        <Chip
          label="+ Workout"
          onClick={() => dispatch({ type: 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET', planId, weekId: week.id })}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed' }}
        />
      </Box>

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
            prevExercise={getPrevExercise(
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
            onClick={() =>
              dispatch({ type: 'ADD_EXERCISE_WITH_SET', planId, weekId: week.id, workoutId: workout.id })
            }
          >
            + Exercise
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PlanWeekView;
