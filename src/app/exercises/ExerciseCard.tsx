'use client';

import {Exercise} from '@prisma/client';
import {Box, Card, CardContent, Chip, Typography} from '@mui/material';
import MuscleHighlight from '@/components/MuscleHighlight';

export default function ExerciseCard({exercise}: {exercise: Exercise}) {
  return (
    <Card variant="outlined" sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <CardContent sx={{flex: 1, display: 'flex', flexDirection: 'column', gap: 1}}>
        {/* Name + category */}
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1}}>
          <Typography variant="subtitle1" sx={{fontWeight: 600, flex: 1, lineHeight: 1.3}}>
            {exercise.name}
          </Typography>
          {exercise.category && (
            <Chip label={exercise.category} size="small" color="primary" variant="outlined" sx={{flexShrink: 0}}/>
          )}
        </Box>

        {/* Anatomy diagram */}
        {exercise.muscles.length > 0 && (
          <Box sx={{height: 100}}>
            <MuscleHighlight muscles={exercise.muscles} exerciseId={exercise.id}/>
          </Box>
        )}

        {/* Equipment chips */}
        {exercise.equipment.length > 0 && (
          <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
            {exercise.equipment.map(eq => (
              <Chip key={eq} label={eq} size="small" sx={{fontSize: '0.7rem'}}/>
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
