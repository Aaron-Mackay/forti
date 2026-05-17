'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';
import type { SectionSlug } from './sections';
import { dashboardEnabledCount } from '../_sections/DashboardCardsSection';
import { workoutEnabledCount } from '../_sections/WorkoutDefaultsSection';

type CoachInfoLite = {
  currentCoach: { name: string } | null;
  sentRequest: { status: 'Pending' | 'Rejected' } | null;
  coachModeActive: boolean;
};

function useCoachInfoLite(): { info: CoachInfoLite | null; loading: boolean } {
  const [info, setInfo] = useState<CoachInfoLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/coach')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { info, loading };
}

export type HubStatus = {
  text: string;
  groupSuffix?: string;
};

export function useHubStatuses({ initialName }: { initialName: string }): Record<SectionSlug, HubStatus> & {
  coachGroupSuffix: string | null;
} {
  const { settings, loading } = useSettings();
  const { info: coach } = useCoachInfoLite();

  const dashboard = dashboardEnabledCount(settings);
  const workout = workoutEnabledCount(settings);
  const checkInDayLabel = CHECK_IN_DAY_NAMES[settings.checkInDay] ?? '—';
  const tracked = settings.trackedE1rmExercises.length;
  const metrics = settings.customMetrics.length;

  const coachStatus: string = (() => {
    if (!coach) return loading ? 'Loading…' : 'No coach';
    if (coach.currentCoach) return `Linked · ${coach.currentCoach.name}`;
    if (coach.sentRequest?.status === 'Pending') return 'Pending request';
    if (coach.sentRequest?.status === 'Rejected') return 'Request declined';
    return 'No coach';
  })();

  const coachGroupSuffix =
    coach?.sentRequest?.status === 'Pending'
      ? '· ONE PENDING'
      : coach?.sentRequest?.status === 'Rejected'
        ? '· DECLINED'
        : null;

  return {
    profile: { text: initialName || 'Unnamed' },
    signal: { text: settings.signalUiEnabled ? 'On — opt-in' : 'Off' },
    signout: { text: 'Forti session' },
    dashboard: { text: `${dashboard.enabled} of ${dashboard.total} on` },
    workout: { text: `${workout.enabled} of ${workout.total} · ${settings.effortMetric.toUpperCase()}` },
    tracked: { text: `${tracked} of 5` },
    metrics: { text: `${metrics} of 4` },
    checkin: { text: checkInDayLabel },
    units: { text: `${settings.weightUnit} · ${settings.bodyweightUnit}` },
    onboarding: { text: settings.onboardingDismissed ? 'Dismissed' : 'Showing on Home' },
    coach: { text: coachStatus },
    'coach-mode': { text: (coach?.coachModeActive ?? settings.coachModeActive) ? 'On' : 'Off' },
    export: { text: '3 CSVs' },
    coachGroupSuffix,
  };
}
