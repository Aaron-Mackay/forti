'use client';

import { useSettingsWithSaved } from '../_components/SavedState';
import { ToggleRowList } from './ToggleRowList';
import type { Settings } from '@/types/settingsTypes';

type Row = {
  key: keyof Pick<
    Settings,
    | 'showNextWorkout'
    | 'showTodaysMetrics'
    | 'showWeeklyTraining'
    | 'showActiveBlock'
    | 'showUpcomingEvents'
    | 'showMetricsChart'
    | 'showE1rmProgress'
  >;
  label: string;
  sublabel: string;
};

const ROWS: Row[] = [
  { key: 'showNextWorkout', label: 'Next workout', sublabel: 'The hero command on Home.' },
  { key: 'showTodaysMetrics', label: "Today's metrics", sublabel: 'Weight, sleep, mood, energy strip.' },
  { key: 'showWeeklyTraining', label: 'Weekly training', sublabel: 'Volume and sessions this week.' },
  { key: 'showActiveBlock', label: 'Active block', sublabel: 'Current training block progress.' },
  { key: 'showUpcomingEvents', label: 'Upcoming events', sublabel: 'Calendar items in the next 14 days.' },
  { key: 'showMetricsChart', label: 'Metrics chart', sublabel: 'Trends across your daily measurements.' },
  { key: 'showE1rmProgress', label: 'E1RM progress', sublabel: 'Tracked-lift e1RM trends.' },
];

export function DashboardCardsSection() {
  const { settings, loading, updateSetting } = useSettingsWithSaved();

  return (
    <ToggleRowList
      rows={ROWS.map((r) => ({
        key: r.key,
        label: r.label,
        sublabel: r.sublabel,
        checked: settings[r.key],
        disabled: loading,
        onChange: (next) => updateSetting(r.key, next),
      }))}
    />
  );
}

export function dashboardEnabledCount(settings: Settings): { enabled: number; total: number } {
  const total = ROWS.length;
  const enabled = ROWS.filter((r) => settings[r.key]).length;
  return { enabled, total };
}
