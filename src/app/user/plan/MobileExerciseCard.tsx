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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1, pl: '2em' }}>
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

        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', pl: '2em' }}>
          {regularSets.map((set, i) => {
            const drops = sets
              .filter(s => s.isDropSet && s.parentSetId === set.id)
              .sort((a, b) => a.order - b.order);
            return (
              <Box key={set.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Box
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
                {drops.map((drop, di) => (
                  <Box
                    key={drop.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      px: 1,
                      py: 0.25,
                      mt: 0.25,
                      bgcolor: 'action.selected',
                      borderRadius: 1,
                      minWidth: '3.5em',
                      borderLeft: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      ↓ D{di + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                      {drop.weight || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      ×{drop.reps || '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MobileExerciseCard;
