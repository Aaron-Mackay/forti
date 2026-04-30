import { useCallback, useEffect, useRef, useState } from 'react';
import type { Metric, WeeklyCheckIn } from '@/generated/prisma/browser';
import { updateMetricClient } from '@lib/metrics';
import type { MetricBreakdownKey } from '@/components/checkin/MetricsDailyBreakdown';

export function useCheckInMetricsEditor({
  checkIn,
  currentWeek,
  setError,
}: {
  checkIn: WeeklyCheckIn;
  currentWeek: Metric[];
  setError: (message: string) => void;
}) {
  const [currentWeekMetrics, setCurrentWeekMetrics] = useState<Metric[]>(currentWeek);
  const metricSaveTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setCurrentWeekMetrics(currentWeek);
  }, [currentWeek]);

  useEffect(() => {
    return () => {
      metricSaveTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      metricSaveTimeoutsRef.current.clear();
    };
  }, []);

  const handleMetricChange = useCallback((dayOffset: number, key: MetricBreakdownKey, value: number | null) => {
    const d = new Date(checkIn.weekStartDate);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    const dateIso = d.toISOString().slice(0, 10);

    let nextMetric: Metric | null = null;
    setCurrentWeekMetrics(prev => {
      const idx = prev.findIndex(m => new Date(m.date).toISOString().slice(0, 10) === dateIso);
      const existing = idx >= 0 ? prev[idx] : undefined;
      const baseMetric: Metric = existing ?? {
        id: 0,
        userId: checkIn.userId,
        date: new Date(dateIso),
        weight: null,
        steps: null,
        sleepMins: null,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        customMetrics: null,
      };
      nextMetric = key.startsWith('custom:')
        ? {
          ...baseMetric,
          customMetrics: {
            ...((baseMetric.customMetrics as Record<string, { value: number | null; target: number | null }> | null) ?? {}),
            [key.replace('custom:', '')]: { value, target: null },
          },
        }
        : { ...baseMetric, [key]: value } as Metric;

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nextMetric;
        return next;
      }
      return [...prev, nextMetric];
    });

    if (!nextMetric) return;

    const saveKey = `${dateIso}:${key}`;
    const existingTimeout = metricSaveTimeoutsRef.current.get(saveKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(async () => {
      try {
        await updateMetricClient(nextMetric as Metric);
      } catch {
        setError('Failed to update metric');
      } finally {
        metricSaveTimeoutsRef.current.delete(saveKey);
      }
    }, 400);
    metricSaveTimeoutsRef.current.set(saveKey, timeoutId);
  }, [checkIn.userId, checkIn.weekStartDate, setError]);

  return { currentWeekMetrics, handleMetricChange };
}
