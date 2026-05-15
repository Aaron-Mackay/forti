'use client';

import { useEffect, useState } from 'react';
import { Box, Drawer, Typography } from '@mui/material';
import { format } from 'date-fns';
import { MetricInput } from '@/app/user/calendar/MetricInput';
import type { MetricKey } from '@/app/user/calendar/MetricBar';
import { getCustomMetricsData } from '@/app/user/calendar/MetricBar';
import type { MetricPrisma } from '@/types/dataTypes';
import type { CustomMetricDef, Settings } from '@/types/settingsTypes';
import { kgToBodyweightDisplay } from '@/lib/units';
import { minToHhMm } from '@/app/user/calendar/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  metricKey: MetricKey | null;
  metricLabel: string;
  metricsByDayKey: Map<string, MetricPrisma>;
  customMetricDefs: CustomMetricDef[];
  bodyweightUnit: Settings['bodyweightUnit'];
  userId: string;
  onMetricSaved: (date: Date, metric: MetricPrisma | null) => void;
};

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function seedInputValue(
  metricKey: MetricKey,
  existing: MetricPrisma | null | undefined,
  bodyweightUnit: Settings['bodyweightUnit'],
): string | number | null {
  if (!existing) return null;
  switch (metricKey) {
    case 'weight':
      return existing.weight != null ? kgToBodyweightDisplay(existing.weight, bodyweightUnit) : null;
    case 'sleepMins':
      return existing.sleepMins != null ? minToHhMm(existing.sleepMins) : null;
    case 'steps':    return existing.steps    ?? null;
    case 'calories': return existing.calories ?? null;
    case 'protein':  return existing.protein  ?? null;
    case 'carbs':    return existing.carbs    ?? null;
    case 'fat':      return existing.fat      ?? null;
    default: {
      const data = getCustomMetricsData(existing.customMetrics);
      return data[metricKey]?.value ?? null;
    }
  }
}

export function BackfillDialog({
  open,
  onClose,
  date,
  metricKey,
  metricLabel,
  metricsByDayKey,
  customMetricDefs,
  bodyweightUnit,
  userId,
  onMetricSaved,
}: Props) {
  const existing = date ? metricsByDayKey.get(dayKey(date)) ?? null : null;
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(metricKey);
  const [inputValue, setInputValue] = useState<string | number | null>(null);

  useEffect(() => {
    if (open && metricKey != null) {
      setSelectedMetric(metricKey);
      setInputValue(seedInputValue(metricKey, existing, bodyweightUnit));
    }
    if (!open) {
      setSelectedMetric(null);
      setInputValue(null);
    }
  }, [open, metricKey, existing, bodyweightUnit]);

  const handleSelect = (m: MetricKey | null) => {
    setSelectedMetric(m);
    if (m == null) onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ p: 2, position: 'relative' }}>
        {date && (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            {metricLabel} · {format(date, 'EEE dd MMM yyyy')}
          </Typography>
        )}
        {date && selectedMetric && (
          <MetricInput
            setSelectedMetric={handleSelect}
            selectedMetric={selectedMetric}
            setInputValue={setInputValue}
            inputValue={inputValue}
            dateMetric={existing}
            selectedDate={date}
            userId={userId}
            setMetricStateCb={onMetricSaved}
            hideBack
            customMetricDefs={customMetricDefs}
            bodyweightUnit={bodyweightUnit}
          />
        )}
      </Box>
    </Drawer>
  );
}
