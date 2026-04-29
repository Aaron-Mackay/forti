'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  workoutSummaries?: Array<{
    workoutId: number;
    workoutName: string;
    completedSets: number;
    plannedSets: number;
  }>;
  onWorkoutsClick?: () => void;
}

export default function WorkoutsSystemCard({
  completedWorkoutsCount,
  plannedWorkoutsCount,
  workoutSummaries = [],
  onWorkoutsClick,
}: Props) {
  return (
    <Stack spacing={1}>
      <Box
        onClick={onWorkoutsClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.75,
          borderRadius: 1,
          bgcolor: 'action.hover',
          cursor: onWorkoutsClick ? 'pointer' : 'default',
          ...(onWorkoutsClick && { '&:hover': { bgcolor: 'action.selected' } }),
        }}
      >
        <Typography variant="body2" color="text.secondary">Training</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {completedWorkoutsCount}/{plannedWorkoutsCount}
          </Typography>
          {onWorkoutsClick && <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        </Box>
      </Box>
      {workoutSummaries.length > 0 && (
        <Stack spacing={0.5}>
          {workoutSummaries.map(workout => (
            <Box key={workout.workoutId} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25, px: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workout.workoutName}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                {workout.completedSets}/{workout.plannedSets} sets
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
