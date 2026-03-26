'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { WorkoutExercisePrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';

interface EditableExerciseLogCardProps {
  exerciseLink: WorkoutExercisePrisma;
  index: number;
  planId: number;
  weekId: number;
  workoutId: number;
}

const EditableExerciseLogCard = ({ exerciseLink, index, planId, weekId, workoutId }: EditableExerciseLogCardProps) => {
  const { dispatch } = useWorkoutEditorContext();
  const exerciseName = exerciseLink.exercise?.name || '';
  const category = exerciseLink.exercise?.category || '';
  const { repRange, restTime, targetRpe, targetRir, sets, isBfr } = exerciseLink;
  const regularSets = sets.filter(s => !s.isDropSet).sort((a, b) => a.order - b.order);

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ pb: '8px !important', pt: 1.5, px: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: '1.4em' }}>
              {index + 1}.
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {exerciseName}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
            ×{regularSets.length}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.5, pl: '2em' }}>
          {category && (
            <Chip label={category} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
          )}
          {isBfr && (
            <Chip label="BFR" size="small" color="warning" sx={{ height: 18, fontSize: '0.7rem' }} />
          )}
          {repRange && (
            <Typography variant="caption" color="text.secondary">
              {repRange} reps
            </Typography>
          )}
          {restTime && (
            <Typography variant="caption" color="text.secondary">
              · {restTime} rest
            </Typography>
          )}
          {targetRpe != null && (
            <Typography variant="caption" color="text.secondary">
              · RPE {targetRpe}
            </Typography>
          )}
          {targetRir != null && (
            <Typography variant="caption" color="text.secondary">
              · {targetRir} RIR
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pl: '2em' }}>
          {regularSets.map((set, i) => {
            const drops = sets
              .filter(s => s.isDropSet && s.parentSetId === set.id)
              .sort((a, b) => a.order - b.order);
            return (
              <Box key={set.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <SetInputBlock
                  label={`S${i + 1}`}
                  weight={set.weight}
                  reps={set.reps}
                  onWeightChange={(w) =>
                    dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: set.id, weight: w })
                  }
                  onRepsChange={(r) =>
                    dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: set.id, reps: r })
                  }
                />
                {drops.map((drop, di) => (
                  <SetInputBlock
                    key={drop.id}
                    label={`↓D${di + 1}`}
                    weight={drop.weight}
                    reps={drop.reps}
                    isDropSet
                    onWeightChange={(w) =>
                      dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: drop.id, weight: w })
                    }
                    onRepsChange={(r) =>
                      dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: drop.id, reps: r })
                    }
                  />
                ))}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

interface SetInputBlockProps {
  label: string;
  weight: number | null;
  reps: number | null;
  isDropSet?: boolean;
  onWeightChange: (w: number | null) => void;
  onRepsChange: (r: number) => void;
}

const inputSx: React.CSSProperties = {
  width: '3.6em',
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

const SetInputBlock = ({ label, weight, reps, isDropSet, onWeightChange, onRepsChange }: SetInputBlockProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      px: 0.5,
      py: 0.5,
      bgcolor: isDropSet ? 'action.selected' : 'action.hover',
      borderRadius: 1,
      minWidth: '4em',
      borderLeft: isDropSet ? '2px solid' : 'none',
      borderColor: isDropSet ? 'divider' : undefined,
    }}
  >
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', mb: 0.25 }}>
      {label}
    </Typography>
    <input
      type="number"
      value={weight ?? ''}
      onChange={(e) => {
        const v = e.target.value === '' ? null : parseFloat(e.target.value);
        onWeightChange(isNaN(v as number) ? null : v);
      }}
      placeholder="kg"
      style={inputSx}
    />
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
      ×
    </Typography>
    <input
      type="number"
      value={reps ?? ''}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v)) onRepsChange(v);
      }}
      placeholder="reps"
      style={inputSx}
    />
  </Box>
);

export default EditableExerciseLogCard;
