'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import type { CheckInWithUser } from '@/types/checkInTypes';
import CoachCheckInDetailClient from './CoachCheckInDetailClient';

interface Props {
  checkInId: number;
  lockedClientId?: string;
}

interface ApiResponse {
  checkIn: CheckInWithUser;
}

export default function CoachCheckInDetailPageClient({ checkInId, lockedClientId }: Props) {
  const [checkIn, setCheckIn] = useState<CheckInWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckIn() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/coach/check-ins/${checkInId}`);
        if (!res.ok) {
          throw new Error('Failed to load check-in');
        }

        const data = await res.json() as ApiResponse;
        if (lockedClientId && data.checkIn.user.id !== lockedClientId) {
          throw new Error('Check-in does not belong to this client');
        }

        if (!cancelled) {
          setCheckIn(data.checkIn);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load this check-in.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCheckIn();

    return () => {
      cancelled = true;
    };
  }, [checkInId, lockedClientId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !checkIn) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', pt: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? 'Failed to load this check-in.'}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Return to the check-ins list and try again.
        </Typography>
      </Box>
    );
  }

  return <CoachCheckInDetailClient checkIn={checkIn} />;
}
