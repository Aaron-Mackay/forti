'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Typography } from '@mui/material';

interface Props {
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  onWorkoutsClick?: () => void;
}

export default function WorkoutsSystemCard({
  completedWorkoutsCount,
  plannedWorkoutsCount,
  onWorkoutsClick,
}: Props) {
  return (
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
  );
}
