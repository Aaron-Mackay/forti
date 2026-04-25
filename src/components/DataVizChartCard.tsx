'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { DataVizCard, DataVizTimeRange, RelativeWeeks } from '@/types/datavizTypes';
import { RELATIVE_WEEK_OPTIONS } from '@/types/datavizTypes';
import { BUILTIN_METRIC_LABELS } from '@/types/metricTypes';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import type { MetricHistoryResponse } from '@lib/contracts/metricHistory';
import { colorTokens } from '@lib/theme';
import { getCheckInWeekStart } from '@lib/checkInUtils';
import { useSettings } from '@lib/providers/SettingsProvider';
import { generateDataVizDummySeries } from './dataVizDummySeries';

const Chart = dynamic(
  () => import('react-apexcharts'),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={CHART_HEIGHT} /> },
);

const CHART_HEIGHT = 200;

interface Props {
  card: DataVizCard;
  gridColumn: string | Record<string, string>;
  /** Pass the client's userId when rendering on the coach review page */
  clientId?: string;
  /** Use runtime controls + live data in use mode; dummy chart in editor-preview mode. */
  mode?: 'use' | 'editor-preview';
  /** Allow runtime date controls while still using dummy preview data. */
  interactivePreview?: boolean;
  /** Render without an outer Paper when embedding inside editor card chrome. */
  withPaper?: boolean;
}

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultAbsoluteRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 42);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
}

function resolveRange(timeRange: DataVizTimeRange, checkInDay: number): { startDate: string; endDate: string } {
  if (timeRange.mode === 'absolute') {
    return { startDate: timeRange.startDate, endDate: timeRange.endDate };
  }
  const windowStart = getCheckInWeekStart(new Date(), checkInDay);
  const end = new Date(windowStart);
  end.setDate(windowStart.getDate() + 6); // last day before check-in day
  const start = new Date(end);
  start.setDate(end.getDate() - timeRange.weeks * 7);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
}

function isInvalidRange(timeRange: DataVizTimeRange): boolean {
  return timeRange.mode === 'absolute' && timeRange.startDate >= timeRange.endDate;
}

export default function DataVizChartCard({
  card,
  gridColumn,
  clientId,
  mode = 'use',
  interactivePreview = false,
  withPaper = true,
}: Props) {
  const { settings } = useSettings();
  const checkInDay = settings.checkInDay ?? 0;

  const [runtimeRange, setRuntimeRange] = useState<DataVizTimeRange>(card.timeRange);
  const isUseMode = mode === 'use';
  const hasRuntimeControls = isUseMode || interactivePreview;

  useEffect(() => {
    setRuntimeRange(card.timeRange);
  }, [card.id, card.timeRange]);

  const activeRange = hasRuntimeControls ? runtimeRange : card.timeRange;
  const { startDate, endDate } = useMemo(() => resolveRange(activeRange, checkInDay), [activeRange, checkInDay]);
  const rangeStartTs = useMemo(() => new Date(`${startDate}T00:00:00`).getTime(), [startDate]);
  const rangeEndTs = useMemo(() => new Date(`${endDate}T23:59:59`).getTime(), [endDate]);
  const rangeInvalid = isInvalidRange(activeRange);

  const url = useMemo(() => {
    if (!isUseMode || rangeInvalid) return null;
    const params = new URLSearchParams({ metric: card.metric, startDate, endDate });
    if (clientId) params.set('clientId', clientId);
    return `/api/metric-history?${params.toString()}`;
  }, [isUseMode, rangeInvalid, card.metric, startDate, endDate, clientId]);

  const { data, loading, error } = useApiGet<MetricHistoryResponse>(url);
  const dummySeries = useMemo(
    () => generateDataVizDummySeries({
      metric: card.metric,
      startDate,
      endDate,
      seedKey: card.id,
    }),
    [card.metric, card.id, startDate, endDate],
  );

  const series = useMemo(() => {
    if (!isUseMode) {
      return [{
        name: BUILTIN_METRIC_LABELS[card.metric],
        data: dummySeries,
      }];
    }
    return [{
      name: BUILTIN_METRIC_LABELS[card.metric],
      data: (data?.points ?? [])
        .filter(p => p.value !== null)
        .map(p => ({ x: new Date(p.date).getTime(), y: p.value as number })),
    }];
  }, [isUseMode, data, card.metric, dummySeries]);

  const title = card.title || BUILTIN_METRIC_LABELS[card.metric];

  const options = useMemo(() => ({
    chart: {
      type: 'line' as const,
      height: CHART_HEIGHT,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      sparkline: { enabled: false },
    },
    stroke: { curve: 'smooth' as const, width: 2 },
    markers: { size: 3 },
    colors: [colorTokens.brand.primary],
    xaxis: {
      type: 'datetime' as const,
      min: rangeStartTs,
      max: rangeEndTs,
      labels: { datetimeUTC: false, format: 'dd MMM' },
    },
    yaxis: {
      labels: {
        formatter: (val: number) =>
          card.metric === 'weight' ? val.toFixed(1) : String(Math.round(val)),
      },
    },
    tooltip: { x: { format: 'dd MMM yyyy' } },
    legend: { show: false },
    grid: { borderColor: colorTokens.surface.borderSubtle },
  }), [card.metric, rangeStartTs, rangeEndTs]);

  const hasPoints = series[0].data.length > 0;

  const body = (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>

      {hasRuntimeControls && (
        <Stack spacing={1.25} sx={{ mb: 1.25 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={runtimeRange.mode}
            fullWidth
            onChange={(_e, nextMode: string | null) => {
              if (!nextMode) return;
              if (nextMode === 'relative') {
                setRuntimeRange({ mode: 'relative', weeks: 4 });
                return;
              }
              const { startDate: start, endDate: end } = defaultAbsoluteRange();
              setRuntimeRange({ mode: 'absolute', startDate: start, endDate: end });
            }}
          >
            <ToggleButton value="relative">Last N weeks</ToggleButton>
            <ToggleButton value="absolute">Date range</ToggleButton>
          </ToggleButtonGroup>

          {runtimeRange.mode === 'relative' ? (
            <FormControl size="small" fullWidth>
              <InputLabel>Weeks</InputLabel>
              <Select
                label="Weeks"
                value={runtimeRange.weeks}
                onChange={e => {
                  setRuntimeRange({
                    mode: 'relative',
                    weeks: Number(e.target.value) as RelativeWeeks,
                  });
                }}
              >
                {RELATIVE_WEEK_OPTIONS.map(n => (
                  <MenuItem key={n} value={n}>Last {n} week{n > 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Start date"
                type="date"
                size="small"
                sx={{ flex: 1 }}
                value={runtimeRange.startDate}
                onChange={e => setRuntimeRange(prev =>
                  prev.mode === 'absolute' ? { ...prev, startDate: e.target.value } : prev,
                )}
                slotProps={{ htmlInput: { max: runtimeRange.endDate } }}
              />
              <TextField
                label="End date"
                type="date"
                size="small"
                sx={{ flex: 1 }}
                value={runtimeRange.endDate}
                onChange={e => setRuntimeRange(prev =>
                  prev.mode === 'absolute' ? { ...prev, endDate: e.target.value } : prev,
                )}
                slotProps={{ htmlInput: { min: runtimeRange.startDate } }}
              />
            </Box>
          )}
        </Stack>
      )}

      {rangeInvalid && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 1.25, fontSize: '0.8rem' }}>
          Start date must be before end date.
        </Alert>
      )}

      {loading && <Skeleton variant="rounded" height={CHART_HEIGHT} />}

      {!loading && error && (
        <Alert severity="error" variant="outlined" sx={{ fontSize: '0.8rem' }}>
          Could not load chart data.
        </Alert>
      )}

      {!loading && !error && !rangeInvalid && !hasPoints && (
        <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.disabled">No data for this range.</Typography>
        </Box>
      )}

      {!loading && !error && !rangeInvalid && hasPoints && (
        <Chart options={options} series={series} type="line" height={CHART_HEIGHT} />
      )}
    </>
  );

  if (!withPaper) {
    return <Box sx={{ gridColumn }}>{body}</Box>;
  }

  return (
    <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
      {body}
    </Paper>
  );
}
