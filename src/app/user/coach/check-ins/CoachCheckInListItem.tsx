'use client';

import Link from 'next/link';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/PendingOutlined';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { CheckInWithUser } from '@/types/checkInTypes';

interface Props {
  checkIn: CheckInWithUser;
  href: string;
}

export default function CoachCheckInListItem({ checkIn, href }: Props) {
  const submittedLabel = new Date(checkIn.completedAt ?? checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const isReviewed = Boolean(checkIn.coachReviewedAt);

  return (
    <Paper
      component={Link}
      href={href}
      elevation={0}
      sx={{
        display: 'block',
        p: { xs: 1.5, sm: 2 },
        color: 'inherit',
        textDecoration: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        transition: 'border-color 160ms ease, transform 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: 'text.primary',
          bgcolor: 'action.hover',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
          {isReviewed
            ? <CheckCircleIcon sx={{ mt: 0.25, fontSize: 18, color: 'success.main', flexShrink: 0 }} />
            : <PendingIcon sx={{ mt: 0.25, fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
          }
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" fontWeight={700} noWrap>
              {checkIn.user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Week of {weekLabel}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Chip
            size="small"
            color={isReviewed ? 'success' : 'warning'}
            variant={isReviewed ? 'filled' : 'outlined'}
            label={isReviewed ? 'Reviewed' : 'Needs review'}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Submitted {submittedLabel}
          </Typography>
          <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
        </Stack>
      </Stack>
    </Paper>
  );
}
