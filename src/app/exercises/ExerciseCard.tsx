'use client';

import {Exercise} from '@prisma/client';
import {Box, Card, CardContent, Chip, Typography} from '@mui/material';
import MuscleHighlight from '@/components/MuscleHighlight';

function toTitleCase(str: string) {
  return str.split(/[-\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function ExerciseCard({exercise}: {exercise: Exercise}) {
  return (
    <Card variant="outlined" sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <CardContent sx={{flex: 1, display: 'flex', flexDirection: 'column', gap: 1}}>
        {/* Name */}
        <Typography variant="subtitle1" sx={{fontWeight: 600, lineHeight: 1.3}}>
          {exercise.name}
        </Typography>

        {/* Primary muscle chips */}
        {exercise.primaryMuscles.length > 0 && (
          <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
            {exercise.primaryMuscles.map(m => (
              <Chip key={m} label={toTitleCase(m)} size="small" color="primary" variant="outlined" sx={{fontSize: '0.7rem'}}/>
            ))}
          </Box>
        )}

        {/* Secondary muscle chips */}
        {exercise.secondaryMuscles.length > 0 && (
          <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
            {exercise.secondaryMuscles.map(m => (
              <Chip key={m} label={toTitleCase(m)} size="small" color="warning" variant="outlined" sx={{fontSize: '0.7rem'}}/>
            ))}
          </Box>
        )}

        {/* Anatomy diagram */}
        {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
          <Box sx={{height: 100}}>
            <MuscleHighlight
              primaryMuscles={exercise.primaryMuscles}
              secondaryMuscles={exercise.secondaryMuscles}
              exerciseId={exercise.id}
            />
          </Box>
        )}

        {/* Equipment chips */}
        {exercise.equipment.length > 0 && (
          <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
            {exercise.equipment.map(eq => (
              <Chip key={eq} label={toTitleCase(eq)} size="small" sx={{fontSize: '0.7rem'}}/>
            ))}
          </Box>
        )}

        {/* Description */}
        {exercise.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {exercise.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
