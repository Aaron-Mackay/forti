'use client';

import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { WorkoutExercisePrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { Dir } from '@/lib/useWorkoutEditor';

interface ExerciseProgressCardProps {
  exerciseLink: WorkoutExercisePrisma;
  prevExercise: WorkoutExercisePrisma | null;
  index: number;
  planId: number;
  weekId: number;
  workoutId: number;
  isFirst: boolean;
  isLast: boolean;
}

const inputSx: React.CSSProperties = {
  width: '3.4em',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.23)',
  borderRadius: '4px',
  padding: '3px 4px',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  MozAppearance: 'textfield',
};

const ExerciseProgressCard = ({
  exerciseLink,
  prevExercise,
  index,
  planId,
  weekId,
  workoutId,
  isFirst,
  isLast,
}: ExerciseProgressCardProps) => {
  const { dispatch } = useWorkoutEditorContext();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const exerciseName = exerciseLink.exercise?.name || '(unnamed exercise)';
  const { repRange, restTime, targetRpe, targetRir } = exerciseLink;
  const regularSets = exerciseLink.sets
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);
  const prevRegularSets = (prevExercise?.sets ?? [])
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);

  const maxSets = Math.max(regularSets.length, prevRegularSets.length);

  const metaParts = [
    repRange && `${repRange} reps`,
    restTime,
    targetRpe != null && `RPE ${targetRpe}`,
    targetRir != null && `${targetRir} RIR`,
  ].filter(Boolean);

  return (
    <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
            {index + 1}. {exerciseName}
          </Typography>
          {metaParts.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {metaParts.join(' · ')}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ ml: 0.5, mt: -0.25 }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Column headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2em 1fr 1fr', gap: 0.5, mb: 0.5 }}>
        <Box />
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
          LAST
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
          THIS WEEK
        </Typography>
      </Box>

      {/* Sets */}
      {Array.from({ length: maxSets }, (_, i) => {
        const set = regularSets[i];
        const prev = prevRegularSets[i];
        const prevText =
          prev?.weight != null && prev?.reps != null
            ? `${prev.weight}×${prev.reps}`
            : prev?.weight != null
            ? `${prev.weight}kg`
            : prev?.reps != null
            ? `×${prev.reps}`
            : '—';

        return (
          <Box
            key={set?.id ?? `missing-${i}`}
            sx={{ display: 'grid', gridTemplateColumns: '2em 1fr 1fr', gap: 0.5, mb: 0.5, alignItems: 'center' }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              S{i + 1}
            </Typography>

            {/* LAST */}
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ textAlign: 'center', fontSize: '0.78rem' }}
            >
              {prevText}
            </Typography>

            {/* THIS WEEK */}
            {set ? (
              <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="number"
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : parseFloat(e.target.value);
                    dispatch({
                      type: 'UPDATE_SET_WEIGHT',
                      planId,
                      weekId,
                      workoutId,
                      exerciseId: exerciseLink.id,
                      setId: set.id,
                      weight: isNaN(v as number) ? null : v,
                    });
                  }}
                  placeholder="kg"
                  style={inputSx}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  ×
                </Typography>
                <input
                  type="number"
                  value={set.reps ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) {
                      dispatch({
                        type: 'UPDATE_SET_REPS',
                        planId,
                        weekId,
                        workoutId,
                        exerciseId: exerciseLink.id,
                        setId: set.id,
                        reps: v,
                      });
                    }
                  }}
                  placeholder="reps"
                  style={inputSx}
                />
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
                —
              </Typography>
            )}
          </Box>
        );
      })}

      {/* + Set */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
          onClick={() =>
            dispatch({ type: 'ADD_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id })
          }
        >
          + Set
        </Typography>
      </Box>

      {/* Contextual menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {!isFirst && (
          <MenuItem
            onClick={() => {
              dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.UP, index });
              setMenuAnchor(null);
            }}
          >
            Move up
          </MenuItem>
        )}
        {!isLast && (
          <MenuItem
            onClick={() => {
              dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.DOWN, index });
              setMenuAnchor(null);
            }}
          >
            Move down
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            dispatch({ type: 'REMOVE_EXERCISE', planId, weekId, workoutId, exerciseId: exerciseLink.id });
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          Remove
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ExerciseProgressCard;
