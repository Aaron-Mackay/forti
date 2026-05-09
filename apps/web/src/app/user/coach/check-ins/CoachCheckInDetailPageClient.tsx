'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import type { Metric } from '@/generated/prisma/browser';
import type { CheckInWithUser, WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import type { TargetTemplateWithDays } from '@lib/targetTemplates';
import type { CheckInTemplate } from '@/types/checkInTemplateTypes';
import CoachCheckInDetailClient from './CoachCheckInDetailClient';
import { getCoachCheckInDetail, getCoachCheckInTemplate } from '@lib/clientApi';
import type { CoachCheckInDetailResponse } from '@lib/contracts/coach';

interface Props {
  checkInId: number;
  lockedClientId?: string;
}

export default function CoachCheckInDetailPageClient({ checkInId, lockedClientId }: Props) {
  const [checkIn, setCheckIn] = useState<CheckInWithUser | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Metric[]>([]);
  const [weekPrior, setWeekPrior] = useState<Metric[]>([]);
  const [weekTargets, setWeekTargets] = useState<WeekTargets | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<TargetTemplateWithDays | null>(null);
  const [customMetricDefs, setCustomMetricDefs] = useState<CustomMetricDef[]>([]);
  const [workoutSummaries, setWorkoutSummaries] = useState<CoachCheckInDetailResponse['workoutSummaries']>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [coachTemplate, setCoachTemplate] = useState<CheckInTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckIn() {
      setLoading(true);
      setError(null);

      try {
        const [data, templateData] = await Promise.all([
          getCoachCheckInDetail(checkInId),
          getCoachCheckInTemplate().catch(() => ({ template: null })),
        ]);
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
          setWorkoutSummaries(data.workoutSummaries ?? []);
          setActivePlanId(data.activePlanId ?? null);
          setCoachTemplate(templateData.template);
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

  return (
    <CoachCheckInDetailClient
      checkIn={checkIn}
      currentWeek={currentWeek}
      weekPrior={weekPrior}
      weekTargets={weekTargets}
      activeTemplate={activeTemplate}
      customMetricDefs={customMetricDefs}
      workoutSummaries={workoutSummaries}
      activePlanId={activePlanId}
      coachTemplate={coachTemplate}
    />
  );
}
