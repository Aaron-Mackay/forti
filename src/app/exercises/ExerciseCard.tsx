'use client';

import {Exercise} from '@/generated/prisma/browser';
import {Box, Card, CardContent, Chip, Typography} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MuscleHighlight from '@/components/MuscleHighlight';

export default function ExerciseCard({
  exercise,
  coachDescription,
}: {
  exercise: Exercise;
  coachDescription?: string;
}) {
  const displayDescription = coachDescription ?? exercise.description;
  const isCoachOverride = Boolean(coachDescription);

  return (
    <Card variant="outlined" sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <CardContent sx={{flex: 1, display: 'flex', flexDirection: 'column', gap: 1}}>
        {/* Name */}
        <Typography variant="subtitle2" sx={{fontWeight: 600, lineHeight: 1.3}}>
          {exercise.name}
        </Typography>

        {/* Anatomy diagram */}
        {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
          <Box sx={{height: 100}}>
            <MuscleHighlight
              primaryMuscles={exercise.primaryMuscles}
              secondaryMuscles={exercise.secondaryMuscles}
              exerciseId={exercise.id}
              filterByQuadrants
            />
          </Box>
        )}

        {/* Description — coach override takes precedence over default */}
        {displayDescription && (
          <Box>
            {isCoachOverride && (
              <Chip
                icon={<SchoolIcon sx={{fontSize: '0.8rem !important'}}/>}
                label="Coach"
                size="small"
                color="secondary"
                variant="outlined"
                sx={{fontSize: '0.65rem', height: 20, mb: 0.5}}
              />
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayDescription}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
