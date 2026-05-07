'use client';

import dynamic from 'next/dynamic';
import {Box, Skeleton, Typography} from '@mui/material';
import {format} from 'date-fns';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';
import {colorTokens} from '@lib/theme';

// Captured at module load time so it isn't re-evaluated during renders
const MODULE_LOAD_TIMESTAMP = Date.now();

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({default: () => null})),
  {ssr: false, loading: () => <Skeleton variant="rounded" height={80}/>},
);

export default function E1rmSparkline({
  exerciseId,
  history,
  todayE1RM,
}: {
  exerciseId: number;
  history: E1rmHistoryPoint[] | null;
  todayE1RM: number | null;
}) {
  const nowTimestamp = MODULE_LOAD_TIMESTAMP;

  if (history === null) {
    return (
      <Box sx={{width: '100%', mb: 1}}>
        <Skeleton variant="rounded" height={80}/>
      </Box>
    );
  }

  const valid = history.filter(p => typeof p.bestE1rm === 'number');
  if (valid.length === 0 && todayE1RM === null) {
    return (
      <Box sx={{width: '100%', mb: 1}}>
        <Box
          sx={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            Log a weighted set to start tracking
          </Typography>
        </Box>
      </Box>
    );
  }

  // Build series: historical points + optional live "Now" point, using timestamps for a proportional x-axis
  const historicalData = valid.map(p => ({
    x: new Date(p.date).getTime(),
    y: parseFloat(p.bestE1rm.toFixed(1)),
  }));
  const seriesData = todayE1RM !== null
    ? [...historicalData, {x: nowTimestamp, y: parseFloat(todayE1RM.toFixed(1))}]
    : historicalData;
  const nowIndex = todayE1RM !== null ? seriesData.length - 1 : -1;

  if (seriesData.length === 0) return null;

  // Discrete marker override: colour only the live "Now" point green
  const discreteMarkers = todayE1RM !== null
    ? [{seriesIndex: 0, dataPointIndex: nowIndex, fillColor: colorTokens.status.success, strokeColor: colorTokens.status.success, size: 5}]
    : [];

  const series = [{name: 'Best e1RM', data: seriesData}];

  return (
    <Box sx={{width: '100%', mb: 1}}>
      {/* swiper-no-swiping prevents Swiper from intercepting touch events on this chart */}
      <Box
        className="swiper-no-swiping"
        sx={{
          border: `1px solid ${colorTokens.surface.borderStrong}`,
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
        }}
      >
        <Chart
          type="line"
          height={80}
          series={series}
          options={{
            chart: {
              selection: {enabled: false},
              zoom: {enabled: false},
              id: `e1rm-sparkline-${exerciseId}`,
              animations: {enabled: false},
              toolbar: {show: false},
            },
            stroke: {curve: 'smooth', width: 2},
            markers: {
              size: 4,
              discrete: discreteMarkers,
            },
            tooltip: {
              x: {
                formatter: (_val, opts?: {dataPointIndex?: number}) => {
                  const idx = opts?.dataPointIndex ?? 0;
                  if (idx === nowIndex) return 'Now';
                  const point = seriesData[idx];
                  return point ? format(new Date(point.x), 'dd MMM yyyy') : '';
                },
              },
            },
            colors: [colorTokens.brand.primary],
            xaxis: {
              type: 'datetime',
              labels: {show: false},
              axisBorder: {show: false},
              axisTicks: {show: false},
            },
            yaxis: {
              labels: {show: false},
            },
            grid: {
              show: false,
              padding: {left: 0, right: 8, top: 5, bottom: 0},
            },
          }}
        />
      </Box>
    </Box>
  );
}
