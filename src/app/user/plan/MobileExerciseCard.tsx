'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { WorkoutExercisePrisma } from '@/types/dataTypes';

interface MobileExerciseCardProps {
  exerciseLink: WorkoutExercisePrisma;
  index: number;
}

const MobileExerciseCard = ({ exerciseLink, index }: MobileExerciseCardProps) => {
  const exerciseName = exerciseLink.exercise?.name || '';
  const category = exerciseLink.exercise?.category || '';
  const { repRange, restTime, sets } = exerciseLink;

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
            ×{sets.length}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1, pl: '2em' }}>
          {category && (
            <Chip label={category} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
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
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', pl: '2em' }}>
          {sets.map((set, i) => (
            <Box
              key={set.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 1,
                py: 0.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                minWidth: '3.5em',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                S{i + 1}
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                {set.weight || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                ×{set.reps || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MobileExerciseCard;
