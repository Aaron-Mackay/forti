'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import type { Metric } from '@/generated/prisma/browser';
import type { CheckInWithUser, WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import type { TargetTemplateWithDays } from '@lib/targetTemplates';
import CoachCheckInDetailClient from './CoachCheckInDetailClient';

interface Props {
  checkInId: number;
  lockedClientId?: string;
}

interface WeekWorkout {
  id: number;
  name: string;
  dateCompleted: string;
  week: { planId: number };
}

interface ApiResponse {
  checkIn: CheckInWithUser;
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  activeTemplate: TargetTemplateWithDays | null;
  customMetricDefs: CustomMetricDef[];
  weekWorkouts: WeekWorkout[];
}

export default function CoachCheckInDetailPageClient({ checkInId, lockedClientId }: Props) {
  const [checkIn, setCheckIn] = useState<CheckInWithUser | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Metric[]>([]);
  const [weekPrior, setWeekPrior] = useState<Metric[]>([]);
  const [weekTargets, setWeekTargets] = useState<WeekTargets | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<TargetTemplateWithDays | null>(null);
  const [customMetricDefs, setCustomMetricDefs] = useState<CustomMetricDef[]>([]);
  const [weekWorkouts, setWeekWorkouts] = useState<WeekWorkout[]>([]);
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
          setCurrentWeek(data.currentWeek);
          setWeekPrior(data.weekPrior);
          setWeekTargets(data.weekTargets);
          setActiveTemplate(data.activeTemplate);
          setCustomMetricDefs(data.customMetricDefs);
          setWeekWorkouts(data.weekWorkouts);
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

  return <CoachCheckInDetailClient checkIn={checkIn} currentWeek={currentWeek} weekPrior={weekPrior} weekTargets={weekTargets} activeTemplate={activeTemplate} customMetricDefs={customMetricDefs} weekWorkouts={weekWorkouts} />;
}
